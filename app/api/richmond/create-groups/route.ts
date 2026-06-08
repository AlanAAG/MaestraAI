import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'

const CreateGroupsSchema = z.object({
  groups: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        grade: z.string().min(1),
        richmond_class_code: z.string().min(1),
        academic_year: z.string().min(1),
      })
    )
    .min(1)
    .max(20),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429, headers }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id, school_id')
      .eq('auth_id', user.id)
      .single()

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    if (!teacher.school_id) {
      return NextResponse.json({ error: 'Teacher has no school assigned' }, { status: 400 })
    }

    const body = await req.json()
    const input = CreateGroupsSchema.parse(body)

    const insertData = input.groups.map((g) => ({
      school_id: teacher.school_id,
      titular_teacher_id: teacher.id,
      name: g.name,
      grade: g.grade,
      academic_year: g.academic_year,
      richmond_class_code: g.richmond_class_code,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error: insertError } = await (supabase as any)
      .from('groups')
      .insert(insertData)
      .select('id, name, richmond_class_code')

    if (insertError) {
      console.error('Group creation error:', insertError)
      return NextResponse.json({ error: 'Failed to create groups' }, { status: 500 })
    }

    return NextResponse.json({ created })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Create groups error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
