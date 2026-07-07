import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'
import { checkRateLimit } from '@/lib/rate-limit'

const PatchSchema = z.object({
  role_type: z.enum(['teacher', 'admin', 'coordinator']),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: requester } = await (supabase as any)
      .from('teachers')
      .select('id, role_type, school_id')
      .eq('auth_id', user.id)
      .single()

    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (requester.role_type !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (requester.id === params.id) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 })
    }

    const body = PatchSchema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

    // Verify target is in same school
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: target } = await (supabase as any)
      .from('teachers')
      .select('id, school_id')
      .eq('id', params.id)
      .single()

    if (!target || target.school_id !== requester.school_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('teachers')
      .update({ role_type: body.data.role_type })
      .eq('id', params.id)
      .select('id, full_name, role_type')
      .single()

    if (error) throw error

    await logAudit({
      teacher_id: requester.id,
      action: AUDIT_ACTIONS.TEACHER_ROLE_CHANGE,
      resource_type: 'teacher',
      resource_id: params.id,
      metadata: { new_role: body.data.role_type },
      req,
    })

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH school/teachers/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
