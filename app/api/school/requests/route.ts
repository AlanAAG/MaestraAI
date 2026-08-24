import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { CreateRequestSchema } from '@/lib/school/requests'

// Teacher → dirección requests. Everything runs user-scoped: RLS (083) decides whether the
// caller sees only their own requests (teacher) or the whole school's (admin).

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: me } = await (supabase as any)
      .from('teachers')
      .select('id, role_type')
      .eq('auth_id', user.id)
      .single()
    if (!me) return NextResponse.json({ requests: [], role_type: null })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('school_requests')
      .select('id, teacher_id, kind, title, body, amount, status, admin_response, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return NextResponse.json({ requests: [], role_type: me.role_type })

    // Names via service role — teachers RLS is self-only, and RLS already scoped which
    // requests (and therefore which teacher ids) this caller may see.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data ?? []) as any[]
    const names = new Map<string, string>()
    const teacherIds = Array.from(new Set(rows.map((r) => r.teacher_id)))
    if (teacherIds.length) {
      const { createServiceClient } = await import('@/lib/supabase/service')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teachers } = await (createServiceClient() as any)
        .from('teachers')
        .select('id, full_name')
        .in('id', teacherIds)
      for (const t of teachers ?? []) names.set(t.id, t.full_name)
    }

    return NextResponse.json({
      requests: rows.map((r) => ({ ...r, teacher_name: names.get(r.teacher_id) ?? null })),
      role_type: me.role_type,
      teacher_id: me.id,
    })
  } catch {
    return NextResponse.json({ requests: [], role_type: null })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    const body = CreateRequestSchema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

    // teacher_id/school_id come from the caller's row — never from the request body.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: me } = await (supabase as any)
      .from('teachers')
      .select('id, school_id')
      .eq('auth_id', user.id)
      .single()
    if (!me?.school_id)
      return NextResponse.json({ error: 'Tu cuenta no tiene escuela asignada.' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error } = await (supabase as any)
      .from('school_requests')
      .insert({
        school_id: me.school_id,
        teacher_id: me.id,
        kind: body.data.kind,
        title: body.data.title,
        body: body.data.body ?? null,
        amount: body.data.amount ?? null,
      })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: 'No pude enviar la solicitud.' }, { status: 500 })

    return NextResponse.json({ id: created.id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/school/requests error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
