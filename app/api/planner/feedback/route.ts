import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { feedbackConflictTarget, FEEDBACK_SECTIONS } from '@/lib/planner/feedback'

const PostSchema = z
  .object({
    fortnight_id: z.string().uuid(),
    section_key: z.string().min(1).max(60).optional(),
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.rating !== undefined || (d.comment ?? '').length > 0, {
    message: 'rating o comment requerido',
  })

// Ownership: the fortnight must belong to the teacher. Returns teacher id or null.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ownTeacherId(supabase: any, userId: string, fortnightId: string) {
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('auth_id', userId)
    .single()
  if (!teacher) return null
  const { data: fn } = await supabase
    .from('fortnights')
    .select('id, teacher_id')
    .eq('id', fortnightId)
    .single()
  if (!fn || fn.teacher_id !== teacher.id) return null
  return teacher.id as string
}

export async function POST(req: NextRequest) {
  try {
    const body = PostSchema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    const { fortnight_id, section_key, rating, comment } = body.data
    if (section_key && !FEEDBACK_SECTIONS.has(section_key)) {
      return NextResponse.json({ error: 'Sección no comentable' }, { status: 422 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { success } = await checkRateLimit(user.id, 'standard', 'plan-feedback')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

    const teacherId = await ownTeacherId(supabase, user.id, fortnight_id)
    if (!teacherId) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('plan_feedback').upsert(
      {
        teacher_id: teacherId,
        fortnight_id,
        section_key: section_key ?? null,
        // Section comments carry no rating; global rows keep whichever fields were sent.
        rating: section_key ? null : (rating ?? null),
        comment: comment || null,
        created_at: new Date().toISOString(),
      },
      { onConflict: feedbackConflictTarget(section_key ?? null) }
    )
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[plan-feedback]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const fortnightId = req.nextUrl.searchParams.get('fortnight_id')
    if (!fortnightId || !z.string().uuid().safeParse(fortnightId).success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // RLS scopes rows to the owning teacher — a plain select is safe here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('plan_feedback')
      .select('section_key, rating, comment')
      .eq('fortnight_id', fortnightId)
    return NextResponse.json({ feedback: data ?? [] })
  } catch (err) {
    console.error('[plan-feedback:get]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
