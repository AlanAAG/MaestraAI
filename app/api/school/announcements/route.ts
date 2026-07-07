import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'
import { checkRateLimit } from '@/lib/rate-limit'

const PostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
  expires_at: z.string().datetime().optional(),
})

async function getTeacher(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('teachers')
    .select('id, school_id, role_type')
    .eq('auth_id', userId)
    .single()
  return data
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // RLS enforces school scoping — just fetch and filter expired
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('school_announcements')
      .select('*, teachers!author_teacher_id(full_name, role_type)')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('published_at', { ascending: false })
      .limit(30)

    if (error) throw error
    return NextResponse.json({ announcements: data || [] })
  } catch (err) {
    console.error('GET announcements error:', err)
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

    const rl = await checkRateLimit(user.id, 'standard', 'school-write')
    if (!rl.success)
      return NextResponse.json(
        { error: 'Demasiadas solicitudes.' },
        { status: 429, headers: rl.headers }
      )

    const teacher = await getTeacher(supabase, user.id)
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!teacher.school_id)
      return NextResponse.json({ error: 'Sin escuela asignada' }, { status: 400 })

    if (!['admin', 'coordinator'].includes(teacher.role_type)) {
      return NextResponse.json(
        { error: 'Forbidden — solo admins y coordinadoras pueden publicar avisos' },
        { status: 403 }
      )
    }

    const body = PostSchema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('school_announcements')
      .insert({
        school_id: teacher.school_id,
        author_teacher_id: teacher.id,
        ...body.data,
      })
      .select()
      .single()

    if (error) throw error

    await logAudit({
      teacher_id: teacher.id,
      action: AUDIT_ACTIONS.ANNOUNCEMENT_CREATE,
      resource_type: 'announcement',
      resource_id: data.id,
      req,
    })

    return NextResponse.json({ announcement: data }, { status: 201 })
  } catch (err) {
    console.error('POST announcement error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
