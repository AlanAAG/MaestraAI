import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { normalizePlanDocument } from '@/lib/planner/normalize-document'
import { storePlaneacionEmbedding, planEmbeddingText } from '@/lib/planner/embeddings'

/**
 * Reverts one chat turn, restoring the plan_document snapshot taken before it ran.
 *
 * Only the most recent un-undone editing turn can be reverted: restoring an older
 * snapshot would silently throw away every edit made after it.
 */
const Schema = z.object({
  fortnight_id: z.string().uuid(),
  message_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    const { fortnight_id, message_id } = body.data

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const { data: teacher } = await db
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .maybeSingle()
    if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: fn } = await db
      .from('fortnights')
      .select('id, teacher_id, project_name')
      .eq('id', fortnight_id)
      .maybeSingle()
    if (!fn || fn.teacher_id !== teacher.id) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    // RLS already scopes to this teacher; the explicit filters keep it honest.
    const { data: msg } = await db
      .from('plan_chat_messages')
      .select('id, plan_snapshot, undone_at, created_at')
      .eq('id', message_id)
      .eq('fortnight_id', fortnight_id)
      .eq('teacher_id', teacher.id)
      .maybeSingle()
    if (!msg?.plan_snapshot) {
      return NextResponse.json({ error: 'Ese mensaje no cambió el documento.' }, { status: 404 })
    }
    if (msg.undone_at) {
      return NextResponse.json({ error: 'Ese cambio ya se deshizo.' }, { status: 409 })
    }

    // Guard against reverting out of order — the snapshot predates any later edit,
    // so restoring it would drop them without warning.
    const { data: newer } = await db
      .from('plan_chat_messages')
      .select('id')
      .eq('fortnight_id', fortnight_id)
      .eq('teacher_id', teacher.id)
      .is('undone_at', null)
      .not('plan_snapshot', 'is', null)
      .gt('created_at', msg.created_at)
      .limit(1)
    if (newer?.length) {
      return NextResponse.json(
        { error: 'Hay cambios más recientes. Deshaz el último primero.' },
        { status: 409 }
      )
    }

    const restored = normalizePlanDocument(msg.plan_snapshot as Record<string, unknown>)
    const { error } = await db
      .from('fortnights')
      .update({ plan_document: restored })
      .eq('id', fortnight_id)
    if (error) throw error

    await db
      .from('plan_chat_messages')
      .update({ undone_at: new Date().toISOString() })
      .eq('id', message_id)

    await storePlaneacionEmbedding(supabase, {
      fortnightId: fortnight_id,
      teacherId: teacher.id,
      projectName: String(fn.project_name ?? ''),
      content: planEmbeddingText(restored),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[planner-chat/undo]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
