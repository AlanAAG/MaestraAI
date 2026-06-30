import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const maxDuration = 120

import { buildFlashcardContent } from '@/lib/materials/flashcards'
import { buildGameContent } from '@/lib/materials/games'
import { buildMatching } from '@/lib/materials/matching'
import { buildPictureWordMatch } from '@/lib/materials/picture-word-match'
import { buildSortingGame } from '@/lib/materials/sorting'
import { deriveFortnightContext } from '@/lib/materials/types'
import { fetchVocabImages, fetchTeacherVocabImages } from '@/lib/images'
import { checkRateLimit } from '@/lib/rate-limit'
import { extractVocabulary } from '@/lib/materials/vocab-utils'

const Schema = z.object({
  lesson_plan_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { success, headers } = await checkRateLimit(user.id, 'strict')
  if (!success) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
      { status: 429, headers }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!teacher) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const teacherId = (teacher as { id: string }).id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lessonPlan, error: planError } = await (supabase as any)
    .from('lesson_plans')
    .select('*, fortnights(*, groups(grade))')
    .eq('id', parsed.data.lesson_plan_id)
    .single()

  if (planError || !lessonPlan) {
    return NextResponse.json({ error: 'Planeación no encontrada' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((lessonPlan as any).teacher_id !== teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vocabulary = extractVocabulary((lessonPlan as any).vocabulary)

  if (vocabulary.length === 0) {
    return NextResponse.json({ error: 'Sin vocabulario en esta planeación' }, { status: 400 })
  }

  const imageMap = {
    ...(await fetchVocabImages(vocabulary)),
    ...(await fetchTeacherVocabImages(supabase, vocabulary)), // teacher's own photos win
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = deriveFortnightContext(lessonPlan as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fortnightId = (lessonPlan as any).fortnight_id as string

  type Job = {
    key: string
    type: string
    isProjectable: boolean
    build: () => Promise<unknown>
  }

  const jobs: Job[] = [
    {
      key: 'flashcards',
      type: 'flashcards',
      isProjectable: true,
      build: () => buildFlashcardContent(vocabulary, ctx, imageMap),
    },
    {
      key: 'memory_game',
      type: 'memory_game',
      isProjectable: true,
      build: () => buildGameContent(vocabulary, 'memory_match', ctx, imageMap),
    },
    {
      key: 'matching',
      type: 'matching',
      isProjectable: false,
      build: () => buildMatching(vocabulary, ctx),
    },
    {
      key: 'picture_word_match',
      type: 'picture_word_match',
      isProjectable: true,
      build: () => buildPictureWordMatch(vocabulary, ctx, imageMap),
    },
    {
      key: 'sorting_game',
      type: 'sorting_game',
      isProjectable: true,
      build: () => buildSortingGame(vocabulary, ctx, imageMap),
    },
  ]

  const materialIds: string[] = []
  const errors: string[] = []

  for (const job of jobs) {
    try {
      const content = await job.build()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: material, error: insertError } = await (supabase as any)
        .from('materials')
        .insert({
          teacher_id: teacherId,
          lesson_plan_id: parsed.data.lesson_plan_id,
          fortnight_id: fortnightId,
          type: job.type,
          content,
          vocabulary,
          is_projectable: job.isProjectable,
        })
        .select('id')
        .single()

      if (insertError) {
        errors.push(`${job.key}: ${insertError.message}`)
      } else {
        materialIds.push((material as { id: string }).id)
      }
    } catch (err) {
      console.error(`generate-all: ${job.key} failed:`, err)
      errors.push(job.key)
    }
  }

  return NextResponse.json({
    ok: true,
    material_ids: materialIds,
    count: materialIds.length,
    errors,
  })
}
