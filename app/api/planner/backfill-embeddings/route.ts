import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { storePlaneacionEmbedding, planEmbeddingText } from '@/lib/planner/embeddings'

// One-time: embed the teacher's PRE-EXISTING plans so retrieval works retroactively. Idempotent —
// skips plans already in planeacion_embeddings. New plans are embedded automatically on generate/edit.
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success } = await checkRateLimit(user.id, 'strict')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
    const teacherId = (teacher as { id: string }).id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plans } = await (supabase as any)
      .from('fortnights')
      .select('id, project_name, plan_document')
      .eq('teacher_id', teacherId)
      .not('plan_document', 'is', null)
    const all = (plans ?? []) as Array<{
      id: string
      project_name: string | null
      plan_document: Record<string, unknown>
    }>

    // Skip plans already embedded (idempotent / resumable).
    let alreadyDone = new Set<string>()
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from('planeacion_embeddings')
        .select('fortnight_id')
        .eq('teacher_id', teacherId)
      alreadyDone = new Set((existing ?? []).map((e: { fortnight_id: string }) => e.fortnight_id))
    } catch {
      // table not present yet (migration 054 unpushed) → nothing embeddable anyway
    }

    let embedded = 0
    let skipped = 0
    for (const p of all) {
      const content = planEmbeddingText(p.plan_document ?? {})
      if (alreadyDone.has(p.id) || !content.trim()) {
        skipped++
        continue
      }
      await storePlaneacionEmbedding(supabase, {
        fortnightId: p.id,
        teacherId,
        projectName: String(p.project_name ?? ''),
        content,
      })
      embedded++
    }

    return NextResponse.json({ ok: true, embedded, skipped, total: all.length })
  } catch (e) {
    console.error('[planner/backfill-embeddings]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
