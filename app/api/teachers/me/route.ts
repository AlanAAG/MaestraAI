import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'
import { checkRateLimit } from '@/lib/rate-limit'

const PatchSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  english_period_minutes: z.number().int().min(15).max(120).optional(),
  subject: z.string().max(100).optional(),
  teaching_style: z.string().max(500).optional(),
  profile_notes: z.string().max(1000).optional(),
  design_settings: z
    .object({
      font: z.enum(['sans', 'serif', 'rounded']).optional(),
      size: z.number().min(12).max(22).optional(),
      accent: z.string().max(20).optional(),
      lineIntensity: z.enum(['light', 'medium', 'strong']).optional(),
    })
    .optional(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = await checkRateLimit(user.id, 'relaxed', 'teachers-me')
    if (!rl.success)
      return NextResponse.json(
        { error: 'Demasiadas solicitudes.' },
        { status: 429, headers: rl.headers }
      )

    const base =
      'id, full_name, email, role_type, subject, editorial, school_id, created_at, english_period_minutes, plan_template, schools(name, city, plan)'
    // Try the personalization columns; fall back if migration 049 isn't applied yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: teacher, error } = await (supabase as any)
      .from('teachers')
      .select(`${base}, teaching_style, profile_notes, design_settings`)
      .eq('auth_id', user.id)
      .single()
    if (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;({ data: teacher, error } = await (supabase as any)
        .from('teachers')
        .select(base)
        .eq('auth_id', user.id)
        .single())
    }

    if (error || !teacher) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('groups')
      .select('id', { count: 'exact', head: true })
      .eq('titular_teacher_id', teacher.id)

    return NextResponse.json({ ...teacher, group_count: count ?? 0 })
  } catch (err) {
    console.error('GET /api/teachers/me error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = await checkRateLimit(user.id, 'standard', 'teachers-me')
    if (!rl.success)
      return NextResponse.json(
        { error: 'Demasiadas solicitudes.' },
        { status: 429, headers: rl.headers }
      )

    const body = PatchSchema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('teachers')
      .update({
        ...(body.data.full_name !== undefined ? { full_name: body.data.full_name } : {}),
        ...(body.data.english_period_minutes !== undefined
          ? { english_period_minutes: body.data.english_period_minutes }
          : {}),
        ...(body.data.subject !== undefined ? { subject: body.data.subject } : {}),
        ...(body.data.teaching_style !== undefined
          ? { teaching_style: body.data.teaching_style }
          : {}),
        ...(body.data.profile_notes !== undefined
          ? { profile_notes: body.data.profile_notes }
          : {}),
        ...(body.data.design_settings !== undefined
          ? { design_settings: body.data.design_settings }
          : {}),
      })
      .eq('auth_id', user.id)
      .select('id, full_name')
      .single()

    if (error) throw error

    await logAudit({
      teacher_id: teacher.id,
      action: AUDIT_ACTIONS.TEACHER_PROFILE_UPDATE,
      resource_type: 'teacher',
      resource_id: teacher.id,
      req,
    })

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH /api/teachers/me error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
