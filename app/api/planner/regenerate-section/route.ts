import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { callPlannerModel } from '@/lib/planner/model'
import { normalizePlanDocument } from '@/lib/planner/normalize-document'
import { getLearnedProfile } from '@/lib/planner/learning'
import { FEEDBACK_SECTIONS, feedbackConflictTarget } from '@/lib/planner/feedback'
import { REGENERATE_SYSTEM, buildRegeneratePrompt } from '@/lib/planner/regenerate-section'
import { storePlaneacionEmbedding, planEmbeddingText } from '@/lib/planner/embeddings'

export const maxDuration = 120

const Schema = z.object({
  fortnight_id: z.string().uuid(),
  section_key: z.string().min(1).max(60),
  comment: z.string().trim().min(3).max(2000),
})

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    const { fortnight_id, section_key, comment } = body.data
    if (!FEEDBACK_SECTIONS.has(section_key)) {
      return NextResponse.json({ error: 'Sección no regenerable' }, { status: 422 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    // AI call → strict tier (same cost class as generation).
    const { success } = await checkRateLimit(user.id, 'strict', 'regenerate-section')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fn } = await (supabase as any)
      .from('fortnights')
      .select('id, teacher_id, plan_type, project_name, plan_document')
      .eq('id', fortnight_id)
      .single()
    if (!fn || fn.teacher_id !== teacher.id || !fn.plan_document) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    const currentRaw = (fn.plan_document as Record<string, unknown>)[section_key]
    const currentText = typeof currentRaw === 'string' ? currentRaw : ''
    if (!currentText.trim()) {
      return NextResponse.json({ error: 'La sección está vacía' }, { status: 422 })
    }

    // Save the comment as feedback first — even if the model call fails, the signal is kept.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: fbError } = await (supabase as any).from('plan_feedback').upsert(
      {
        teacher_id: teacher.id,
        fortnight_id,
        section_key,
        rating: null,
        comment,
        created_at: new Date().toISOString(),
      },
      { onConflict: feedbackConflictTarget(section_key) }
    )
    if (fbError) console.error('[regenerate-section] feedback save skipped:', fbError)

    const learned = await getLearnedProfile(
      supabase,
      teacher.id,
      String(fn.plan_type ?? 'quincena')
    )
    const raw = await callPlannerModel(
      REGENERATE_SYSTEM,
      buildRegeneratePrompt({
        sectionKey: section_key,
        currentText,
        comment,
        projectName: String(fn.project_name ?? ''),
        preferences: learned?.preferences ?? '',
        // Shape from getLearnedProfile/refreshLearnedProfile: LearnedProfile.profile.writing_style_samples.
        styleSamples: learned?.profile?.writing_style_samples ?? [],
      }),
      { maxTokens: 4000 }
    )
    const value = raw.trim()
    if (!value) return NextResponse.json({ error: 'La IA no devolvió texto.' }, { status: 502 })

    // Same save path as a manual edit: normalize (bullets/momentos/acronym) then persist.
    const updated = normalizePlanDocument({
      ...(fn.plan_document as Record<string, unknown>),
      [section_key]: value,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('fortnights')
      .update({ plan_document: updated })
      .eq('id', fortnight_id)
    if (error) throw error

    // Re-embed the updated doc so teacher-voice RAG retrieves the regenerated text (same as manual edits).
    await storePlaneacionEmbedding(supabase, {
      fortnightId: fortnight_id,
      teacherId: teacher.id,
      projectName: String(fn.project_name ?? ''),
      content: planEmbeddingText(updated),
    })

    // The implicit loop learns from this too (original → regenerated). Tagged 'regen:' — this is
    // AI output, not the teacher's own words, so it must NOT be distilled as her writing voice
    // (see refreshLearnedProfile's `.not('section', 'like', 'regen:%')` filter); her intent
    // already flows in via plan_feedback above.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: corrError } = await (supabase as any).from('plan_corrections').insert({
        teacher_id: teacher.id,
        fortnight_id,
        section: `regen:${section_key}`,
        original: currentText.slice(0, 6000),
        edited: String(updated[section_key] ?? value).slice(0, 6000),
      })
      if (corrError) console.error('[regenerate-section] correction capture skipped:', corrError)
    } catch (e) {
      console.error('[regenerate-section] correction capture skipped:', e)
    }

    return NextResponse.json({ ok: true, value: String(updated[section_key] ?? value) })
  } catch (err) {
    console.error('[regenerate-section]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
