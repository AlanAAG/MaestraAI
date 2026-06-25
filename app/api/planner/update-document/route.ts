import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { storePlaneacionEmbedding, planEmbeddingText } from '@/lib/planner/embeddings'

const EDITABLE_SECTIONS = new Set([
  'actividades_iniciales',
  'actividades_rutina',
  'aventura_lectora',
  'estrategia_comunitaria',
  'pausas_activas',
  'ajustes_razonables',
  'ejes_articuladores',
  'proyecto',
  'desarrollo_taller',
  'nombre_proyecto',
  'metodologia',
])

const Schema = z.object({
  fortnight_id: z.string().uuid(),
  section: z.string().min(1).max(60),
  value: z.string(),
})

export async function PATCH(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const { fortnight_id, section, value } = body.data

    if (!EDITABLE_SECTIONS.has(section)) {
      return NextResponse.json({ error: 'Section not editable' }, { status: 422 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success } = await checkRateLimit(user.id, 'relaxed')
    if (!success)
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429 }
      )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fn } = await (supabase as any)
      .from('fortnights')
      .select('id, teacher_id, plan_type, project_name, plan_document')
      .eq('id', fortnight_id)
      .single()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!fn || (fn as any).teacher_id !== (teacher as any).id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (!fn.plan_document) {
      return NextResponse.json({ error: 'No plan document exists' }, { status: 422 })
    }

    const original = (fn.plan_document as Record<string, unknown>)[section]
    const updated = { ...(fn.plan_document as Record<string, unknown>), [section]: value }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('fortnights')
      .update({ plan_document: updated })
      .eq('id', fortnight_id)
    if (error) throw error

    // Learning loop (best-effort, non-fatal):
    // (1) capture the original→edited correction — the strongest accuracy signal;
    // (2) re-embed the EDITED doc so RAG retrieves her corrected text, not stale AI output.
    const teacherId = (teacher as { id: string }).id
    if (typeof original === 'string' && original.trim() && original !== value) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('plan_corrections').insert({
          teacher_id: teacherId,
          fortnight_id,
          section,
          original: original.slice(0, 6000),
          edited: value.slice(0, 6000),
        })
      } catch (e) {
        console.error('[update-document] correction capture skipped:', e)
      }
    }
    await storePlaneacionEmbedding(supabase, {
      fortnightId: fortnight_id,
      teacherId,
      projectName: String((fn as { project_name?: string }).project_name ?? ''),
      content: planEmbeddingText(updated),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[update-document]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
