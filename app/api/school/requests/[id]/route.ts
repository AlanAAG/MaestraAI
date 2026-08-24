import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { ResolveRequestSchema, canResolve } from '@/lib/school/requests'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Resolve a request. User-scoped: RLS (083) only lets same-school admins update.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!UUID_RE.test(params.id))
      return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    const body = ResolveRequestSchema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: me } = await (supabase as any)
      .from('teachers')
      .select('id, role_type')
      .eq('auth_id', user.id)
      .single()
    if (me?.role_type !== 'admin')
      return NextResponse.json({ error: 'Solo dirección puede resolver.' }, { status: 403 })

    // Read under RLS: not visible → not this admin's school → 404.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: current } = await (supabase as any)
      .from('school_requests')
      .select('id, status')
      .eq('id', params.id)
      .maybeSingle()
    if (!current) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
    if (!canResolve(current))
      return NextResponse.json({ error: 'La solicitud ya fue resuelta.' }, { status: 409 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('school_requests')
      .update({
        status: body.data.status,
        admin_response: body.data.admin_response ?? null,
        resolved_by: me.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('status', 'pending') // double-resolve race guard
    if (error) return NextResponse.json({ error: 'No pude guardar.' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/school/requests/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
