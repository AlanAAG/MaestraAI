import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'

const PostSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  file_url: z.string().url(),
  resource_type: z.enum(['worksheet', 'game', 'flashcard', 'guide', 'template', 'other']),
  grade_level: z.string().max(50).optional(),
  tags: z.array(z.string()).max(10).optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('teacher_resources')
      .select('*, teachers!teacher_id(full_name)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return NextResponse.json({ resources: data || [] })
  } catch (err) {
    console.error('GET resources error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id, school_id')
      .eq('auth_id', user.id)
      .single()

    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!teacher.school_id)
      return NextResponse.json({ error: 'Sin escuela asignada' }, { status: 400 })

    const body = PostSchema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('teacher_resources')
      .insert({
        school_id: teacher.school_id,
        teacher_id: teacher.id,
        ...body.data,
      })
      .select()
      .single()

    if (error) throw error

    await logAudit({
      teacher_id: teacher.id,
      action: AUDIT_ACTIONS.RESOURCE_SHARE,
      resource_type: 'teacher_resource',
      resource_id: data.id,
      req,
    })

    return NextResponse.json({ resource: data }, { status: 201 })
  } catch (err) {
    console.error('POST resource error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
