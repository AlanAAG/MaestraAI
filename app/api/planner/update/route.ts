import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'

const LessonBlockSchema = z.object({
  time: z.string(),
  activity: z.string(),
  methodology: z.string(),
  materials: z.array(z.string()),
  nem_field: z.string(),
  nem_axis: z.string(),
})

const UpdateLessonPlanSchema = z.object({
  lesson_plan_id: z.string().uuid(),
  blocks: z.array(LessonBlockSchema).optional(),
  vocabulary: z.array(z.string()).optional(),
  observation_students: z.array(z.string()).optional(),
  nee_reminders: z.array(z.string()).optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const input = UpdateLessonPlanSchema.parse(body)

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting - standard tier (50/hour for lesson plan updates)
    const { success, headers } = await checkRateLimit(user.id, 'standard')
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
    const { data: existingPlan } = await (supabase as any)
      .from('lesson_plans')
      .select('*, fortnights!inner(teacher_id)')
      .eq('id', input.lesson_plan_id)
      .single()

    if (!existingPlan) {
      return NextResponse.json({ error: 'Lesson plan not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((existingPlan as any).fortnights.teacher_id !== teacherId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}

    if (input.blocks !== undefined) {
      updateData.blocks = input.blocks
    }
    if (input.vocabulary !== undefined) {
      updateData.vocabulary = input.vocabulary
    }
    if (input.observation_students !== undefined) {
      updateData.observation_students = input.observation_students
    }
    if (input.nee_reminders !== undefined) {
      updateData.nee_reminders = input.nee_reminders
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedPlan, error: updateError } = await (supabase as any)
      .from('lesson_plans')
      .update(updateData)
      .eq('id', input.lesson_plan_id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to update lesson plan' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      lesson_plan: updatedPlan,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }

    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
