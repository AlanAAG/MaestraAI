import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

// School accent color (migration 081). User-scoped update: RLS school_admin_update (079)
// enforces that only the school's admin can change it — unlike the logo route, no service role.

const PutSchema = z.object({
  brand_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable(),
})

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('school_id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher?.school_id) return NextResponse.json({ brand_color: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('schools')
      .select('brand_color')
      .eq('id', teacher.school_id)
      .single()
    return NextResponse.json({ brand_color: error ? null : (data?.brand_color ?? null) })
  } catch {
    return NextResponse.json({ brand_color: null })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    const body = PutSchema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('school_id, role_type')
      .eq('auth_id', user.id)
      .single()
    if (!teacher?.school_id || teacher.role_type !== 'admin')
      return NextResponse.json({ error: 'Solo dirección puede cambiar el color.' }, { status: 403 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('schools')
      .update({ brand_color: body.data.brand_color })
      .eq('id', teacher.school_id)
    if (error) return NextResponse.json({ error: 'No pude guardar el color.' }, { status: 500 })

    return NextResponse.json({ ok: true, brand_color: body.data.brand_color })
  } catch (err) {
    console.error('PUT /api/school/brand error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
