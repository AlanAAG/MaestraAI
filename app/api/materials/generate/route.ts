import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { buildFlashcardContent } from '@/lib/materials/flashcards'
import { buildWorksheetContent } from '@/lib/materials/worksheets'
import { buildGameContent } from '@/lib/materials/games'
import { buildYoutubeRecommendations } from '@/lib/materials/youtube'
import { buildLetterRecognition } from '@/lib/materials/letter-recognition'
import { buildMatching } from '@/lib/materials/matching'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'

const GenerateMaterialsSchema = z.object({
  lesson_plan_id: z.string().uuid(),
  material_types: z.array(
    z.enum(['flashcards', 'worksheets', 'games', 'youtube', 'letter_recognition', 'matching'])
  ),
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
    const { data: lessonPlan, error: lessonError } = await (supabase as any)
      .from('lesson_plans')
      .select('*, fortnights(*)')
      .eq('id', input.lesson_plan_id)
      .single()

    if (lessonError || !lessonPlan) {
      return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((lessonPlan as any).teacher_id !== teacherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Extract vocabulary from lesson plan blocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vocabulary: string[] = (lessonPlan as any).blocks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .flatMap((block: any) => block.vocabulary || [])
      .filter((word: string, index: number, self: string[]) => self.indexOf(word) === index)

    if (vocabulary.length === 0) {
      return NextResponse.json({ error: 'No vocabulary found in lesson plan' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectTheme = (lessonPlan as any).fortnights?.project_name || 'General English'

    const createdMaterials: string[] = []

    // Generate each material type
    for (const materialType of input.material_types) {
      try {
        let content: unknown
        let type: string
        let isProjectable = false

        switch (materialType) {
          case 'flashcards':
            content = await buildFlashcardContent(vocabulary)
            type = 'flashcards'
            isProjectable = true
            break

          case 'worksheets':
            content = await buildWorksheetContent(vocabulary)
            type = 'worksheet'
            isProjectable = false
            break

          case 'games':
            content = await buildGameContent(vocabulary)
            type = 'memory_game'
            isProjectable = true
            break

          case 'youtube':
            content = await buildYoutubeRecommendations(vocabulary, projectTheme)
            type = 'youtube_videos'
            isProjectable = true
            break

          case 'letter_recognition': {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const letter = (lessonPlan as any).fortnights?.letter_week1 || 'A'
            content = await buildLetterRecognition(vocabulary, letter, 'hear_and_circle')
            type = 'letter_recognition'
            isProjectable = false
            break
          }

          case 'matching':
            content = await buildMatching(vocabulary, 'medio')
            type = 'matching'
            isProjectable = false
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
            lesson_plan_id: input.lesson_plan_id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fortnight_id: (lessonPlan as any).fortnight_id,
            type,
            content,
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
        // Continue with other materials even if one fails
      }
    }

    if (createdMaterials.length === 0) {
      return NextResponse.json({ error: 'Failed to generate any materials' }, { status: 500 })
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
