import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { callPlannerModel, PlannerServiceError } from '@/lib/planner/model'
import { sectionToString } from '@/lib/planner/normalize-document'
import { refreshPlanHealth } from '@/lib/planner/plan-health'
import { attachmentsBlock } from '@/lib/planner/attachment-context'
import { nemGroundingBlock } from '@/lib/nem/grounding'
import { isProniApplicable } from '@/lib/nem-official-data'
import { loadPlanTemplate, templateContext } from '@/lib/planner/template-context'
import { getLearnedProfile } from '@/lib/planner/learning'
import { FEEDBACK_SECTIONS, feedbackConflictTarget } from '@/lib/planner/feedback'
import { REGENERATE_SYSTEM, buildRegeneratePrompt } from '@/lib/planner/regenerate-section'
import { buildNeeSection } from '@/lib/planner/nee-section'
import { storePlaneacionEmbedding, planEmbeddingText } from '@/lib/planner/embeddings'

export const maxDuration = 120

const Schema = z.object({
  fortnight_id: z.string().uuid(),
  section_key: z.string().min(1).max(60),
  comment: z.string().trim().min(3).max(2000),
  mode: z.enum(['rewrite', 'complete']).default('rewrite'),
})

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    const { fortnight_id, section_key, comment, mode } = body.data
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
      .select(
        'id, teacher_id, plan_type, project_name, plan_document, nee_notes, start_date, end_date, grade, vocabulary, format_template_id, use_system_template, attachment_context'
      )
      .eq('id', fortnight_id)
      .single()
    if (!fn || fn.teacher_id !== teacher.id || !fn.plan_document) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }
    const currentRaw = (fn.plan_document as Record<string, unknown>)[section_key]
    const currentText = sectionToString(currentRaw)
    // A stale browser warning must never replace a section the teacher has already completed.
    if (mode === 'complete' && currentText.trim().length >= 80) {
      return NextResponse.json({ ok: true, value: currentText, unchanged: true })
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

    const profile = await loadPlanTemplate(supabase, fn)
    const learned =
      profile || fn.use_system_template
        ? null
        : await getLearnedProfile(supabase, teacher.id, String(fn.plan_type ?? 'quincena'))
    const raw = await callPlannerModel(
      REGENERATE_SYSTEM,
      buildRegeneratePrompt({
        sectionKey: section_key,
        currentText,
        comment,
        projectName: String(fn.project_name ?? ''),
        documentContext: JSON.stringify({
          grado: fn.grade,
          fechas: [fn.start_date, fn.end_date],
          vocabulario: fn.vocabulary,
          metodologia: fn.plan_document.metodologia,
          titulos: fn.plan_document._section_titles,
          formato: fn.plan_document._formatting_rules,
          cronograma: fn.plan_document.cronograma,
          proyecto: sectionToString(
            fn.plan_document.proyecto ?? fn.plan_document.desarrollo_taller
          ).slice(0, 4000),
        }),
        preferences: learned?.preferences ?? '',
        // Shape from getLearnedProfile/refreshLearnedProfile: LearnedProfile.profile.writing_style_samples.
        styleSamples: learned?.profile?.writing_style_samples ?? [],
        // Only the ajustes section needs it, and only when the teacher actually described cases:
        // buildNeeSection's empty fallback would assert "ninguno identificado", which would be a
        // lie here — roster-flagged students survive as the "Alumno A" labels already in the text.
        neeContext:
          section_key === 'ajustes_razonables' && (fn as { nee_notes?: string | null }).nee_notes
            ? buildNeeSection([], (fn as { nee_notes?: string | null }).nee_notes)
            : '',
      }),
      {
        maxTokens: 4000,
        cachePrefix: [
          nemGroundingBlock(isProniApplicable(fn.grade ?? ''), undefined, fn.grade),
          templateContext(profile),
          attachmentsBlock(fn),
        ]
          .filter(Boolean)
          .join('\n\n'),
        signal: AbortSignal.timeout(100_000),
      }
    )
    const value = raw.trim()
    if (!value || (mode === 'complete' && value.length < 80))
      return NextResponse.json(
        { error: 'La IA devolvió una sección incompleta. Intenta completarla de nuevo.' },
        { status: 502 }
      )

    // AI may take a minute. Merge onto the latest document so edits to other sections survive.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: latest, error: readError } = await (supabase as any)
      .from('fortnights')
      .select('plan_document')
      .eq('id', fortnight_id)
      .eq('teacher_id', teacher.id)
      .single()
    if (readError) throw readError
    if (
      !latest?.plan_document ||
      JSON.stringify(latest.plan_document[section_key]) !== JSON.stringify(currentRaw)
    ) {
      return NextResponse.json(
        {
          error:
            'Esta sección cambió mientras se generaba. Conservamos tus cambios; actualiza la página.',
        },
        { status: 409 }
      )
    }
    const updated = refreshPlanHealth({
      ...(latest.plan_document as Record<string, unknown>),
      [section_key]: value,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: saved, error } = await (supabase as any).rpc('save_plan_document_if_unchanged', {
      plan_id: fortnight_id,
      expected_document: latest.plan_document,
      new_document: updated,
    })
    if (error) throw error
    if (!saved)
      return NextResponse.json(
        {
          error:
            'La planeación cambió mientras se guardaba. Conservamos tus cambios; intenta de nuevo.',
        },
        { status: 409 }
      )

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
    if (err instanceof PlannerServiceError)
      return NextResponse.json({ error: err.message }, { status: 502 })
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
