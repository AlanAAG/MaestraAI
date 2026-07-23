import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const maxDuration = 120

import { buildFlashcardContent } from '@/lib/materials/flashcards'
import { buildWorksheetContent } from '@/lib/materials/worksheets'
import { buildGameContent } from '@/lib/materials/games'
import { buildYoutubeRecommendations } from '@/lib/materials/youtube'
import { buildLetterRecognition } from '@/lib/materials/letter-recognition'
import { buildMatching } from '@/lib/materials/matching'
import { buildPictureWordMatch } from '@/lib/materials/picture-word-match'
import { buildSortingGame } from '@/lib/materials/sorting'
import {
  deriveFortnightContext,
  fortnightLetters,
  type FortnightContext,
} from '@/lib/materials/types'
import { resolveSelectedContent } from '@/lib/richmond/queries'
import { fetchVocabImages, fetchTeacherVocabImages } from '@/lib/images'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'

const GenerateMaterialsSchema = z
  .object({
    lesson_plan_id: z.string().uuid().optional(),
    // Fortnight-level generation (document-view MaterialGenerator) — no lesson plan involved.
    fortnight_id: z.string().uuid().optional(),
    vocabulary: z.array(z.string()).optional(),
    topic: z.string().max(200).optional(),
    material_types: z.array(
      z.enum([
        'flashcards',
        'worksheets',
        'games',
        'youtube',
        'letter_recognition',
        'matching',
        'picture_word_match',
        'sorting_game',
      ])
    ),
    options: z
      .object({
        memory_pairs: z.number().int().min(3).max(10).optional(),
        letter_activity_type: z.string().optional(),
      })
      .optional(),
    // Vocabulary provenance (display-ready label) — stored as content._vocab_source for card badges.
    vocab_source: z
      .object({
        kind: z.enum(['richmond', 'letters', 'custom']),
        label: z.string().min(1).max(120),
      })
      .optional(),
  })
  .refine((d) => d.lesson_plan_id || d.fortnight_id || (d.vocabulary && d.vocabulary.length > 0), {
    message: 'Provide lesson_plan_id, fortnight_id, or vocabulary[]',
  })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = GenerateMaterialsSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting - strict tier (10/hour for content generation)
    const { success, headers } = await checkRateLimit(user.id, 'strict')
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429, headers }
      )
    }

    // Get teacher record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher, error: teacherError } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teacherId = (teacher as any).id as string

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lessonPlan: any = null
    let vocabulary: string[]
    let projectTheme: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fortnight_id_for_insert: string | null = null

    if (input.lesson_plan_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: lp, error: lessonError } = await (supabase as any)
        .from('lesson_plans')
        .select('*, fortnights(*)')
        .eq('id', input.lesson_plan_id)
        .single()

      if (lessonError || !lp) {
        return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 })
      }
      if (lp.teacher_id !== teacherId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
      lessonPlan = lp
      // Priority: lesson_plan.vocabulary → blocks vocabulary → fortnight.vocabulary
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blockVocab = (lp.blocks ?? []).flatMap((b: any) => b.vocabulary ?? [])
      vocabulary =
        Array.isArray(lp.vocabulary) && lp.vocabulary.length > 0
          ? lp.vocabulary
          : blockVocab.length > 0
            ? blockVocab
            : // eslint-disable-next-line @typescript-eslint/no-explicit-any
              Array.isArray((lp.fortnights as any)?.vocabulary) &&
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (lp.fortnights as any).vocabulary.length > 0
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (lp.fortnights as any).vocabulary
              : Array.isArray(input.vocabulary) && input.vocabulary.length > 0
                ? input.vocabulary
                : []
      projectTheme = lp.fortnights?.project_name || 'General English'
      fortnight_id_for_insert = lp.fortnight_id ?? null
    } else {
      // Standalone generation — vocabulary provided directly
      vocabulary = input.vocabulary ?? []
      projectTheme = input.topic || 'General English'
    }

    // Fortnight-level generation: fetch the fortnight so letters/theme/richmond context work
    // without a lesson plan (the document-view MaterialGenerator path).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fortnightRow: any = null
    if (!lessonPlan && input.fortnight_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: fnData } = await (supabase as any)
        .from('fortnights')
        .select('*')
        .eq('id', input.fortnight_id)
        .eq('teacher_id', teacherId)
        .maybeSingle()
      if (fnData) {
        fortnightRow = fnData
        fortnight_id_for_insert = fnData.id
        if (!input.topic) projectTheme = fnData.project_name || projectTheme
        if (vocabulary.length === 0 && Array.isArray(fnData.vocabulary)) {
          vocabulary = fnData.vocabulary
        }
      }
    }

    // Fortnight data regardless of entry path (lesson plan join or direct fortnight fetch).
    const fortnight = lessonPlan?.fortnights ?? fortnightRow

    if (vocabulary.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró vocabulario. Agrega palabras a la quincena o a este día.' },
        { status: 400 }
      )
    }

    const imageMap = {
      ...(await fetchVocabImages(vocabulary)),
      ...(await fetchTeacherVocabImages(supabase, vocabulary)), // teacher's own photos win
    }
    const ctx: FortnightContext = lessonPlan
      ? deriveFortnightContext(lessonPlan)
      : fortnight
        ? deriveFortnightContext({ fortnights: fortnight })
        : {
            project_name: projectTheme,
            monthly_value: null,
            richmond_unit: null,
            richmond_student_pages: null,
            letter: vocabulary[0]?.[0]?.toUpperCase() ?? 'A',
            grade: '',
            methodology_types: null,
          }

    // Richmond unit learning goals → materials practice what the unit TEACHES, not just its words.
    // Best-effort: missing selection/tables → no goals, builders unchanged.
    try {
      if (fortnight?.richmond_unit_id) {
        const selected = await resolveSelectedContent(
          supabase,
          fortnight.richmond_unit_id,
          (fortnight.richmond_lesson_group_ids as string[] | null) ?? []
        )
        if (selected?.learning_goals?.length) ctx.learning_goals = selected.learning_goals
      }
    } catch (err) {
      console.error('[materials/generate] richmond goals lookup failed:', err)
    }

    const createdMaterials: string[] = []
    let lastBuilderError: string | null = null

    // Generate each material type
    for (const materialType of input.material_types) {
      try {
        let content: unknown
        let type: string
        let isProjectable = false

        switch (materialType) {
          case 'flashcards':
            content = await buildFlashcardContent(vocabulary, ctx, imageMap)
            type = 'flashcards'
            isProjectable = true
            break

          case 'worksheets':
            content = await buildWorksheetContent(vocabulary)
            type = 'worksheet'
            isProjectable = false
            break

          case 'games':
            content = await buildGameContent(
              vocabulary,
              'memory_match',
              ctx,
              imageMap,
              input.options?.memory_pairs ?? 6
            )
            type = 'memory_game'
            isProjectable = true
            break

          case 'youtube':
            // Fortnight focus letters → Bounce Patrol letter songs prepended.
            content = await buildYoutubeRecommendations(
              vocabulary,
              projectTheme,
              fortnightLetters(fortnight)
            )
            type = 'youtube_videos'
            isProjectable = true
            break

          case 'letter_recognition': {
            // Cover ALL letters of BOTH weeks (each field can be comma-separated, e.g. "A, B").
            const found = fortnightLetters(fortnight)
            const letters = found.length ? found : ['A']
            const act = input.options?.letter_activity_type
            const activity = (
              ['hear_and_circle', 'match_to_letter', 'trace_and_say'].includes(act ?? '')
                ? act
                : 'hear_and_circle'
            ) as 'hear_and_circle' | 'match_to_letter' | 'trace_and_say'
            content = await buildLetterRecognition(vocabulary, letters, activity, imageMap)
            type = 'letter_recognition'
            isProjectable = false
            break
          }

          case 'matching':
            content = await buildMatching(vocabulary, ctx)
            type = 'matching'
            isProjectable = false
            break

          case 'picture_word_match':
            content = await buildPictureWordMatch(vocabulary, ctx, imageMap)
            type = 'picture_word_match'
            isProjectable = true
            break

          case 'sorting_game':
            content = await buildSortingGame(vocabulary, ctx, imageMap)
            type = 'sorting_game'
            isProjectable = true
            break

          default:
            continue
        }

        // Insert into materials table
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: material, error: insertError } = await (supabase as any)
          .from('materials')
          .insert({
            teacher_id: teacherId,
            lesson_plan_id: input.lesson_plan_id ?? null,
            fortnight_id: fortnight_id_for_insert,
            type,
            content: input.vocab_source
              ? { ...(content as Record<string, unknown>), _vocab_source: input.vocab_source }
              : content,
            vocabulary,
            is_projectable: isProjectable,
          })
          .select('id')
          .single()

        if (insertError) {
          console.error(`Failed to insert ${materialType}:`, insertError)
          throw insertError
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createdMaterials.push((material as any).id)
      } catch (err) {
        console.error(`Error generating ${materialType}:`, err)
        lastBuilderError = `${materialType}: ${err instanceof Error ? err.message : String(err)}`
        // Continue with other materials even if one fails
      }
    }

    if (createdMaterials.length === 0) {
      // Surface the underlying cause — an opaque 500 hides env/model problems in prod.
      console.error('[materials/generate] all builders failed:', lastBuilderError)
      return NextResponse.json(
        { error: 'Failed to generate any materials', detail: lastBuilderError },
        { status: 500 }
      )
    }

    // Audit log - material generation
    await logAudit({
      teacher_id: teacherId,
      action: AUDIT_ACTIONS.MATERIAL_GENERATE,
      resource_type: 'materials',
      resource_id: input.lesson_plan_id,
      metadata: {
        material_types: input.material_types,
        vocabulary_count: vocabulary.length,
        project_theme: projectTheme,
        materials_created: createdMaterials.length,
      },
      req,
    })

    return NextResponse.json({
      success: true,
      material_ids: createdMaterials,
      count: createdMaterials.length,
    })
  } catch (err) {
    console.error('Material generation error:', err)
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
