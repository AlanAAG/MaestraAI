import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'

// Admin sets the school's portal slug → maestraia.com/escuela/<slug>.
const Schema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,30}$/, 'Solo minúsculas, números y guiones (2-31 caracteres)'),
})

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json().catch(() => null))
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 })
    }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { success } = await checkRateLimit(user.id, 'standard', 'school-slug')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('school_id, role_type')
      .eq('auth_id', user.id)
      .single()
    if (!teacher?.school_id || teacher.role_type !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('schools')
      .update({ slug: body.data.slug })
      .eq('id', teacher.school_id)
    if (error) {
      if (String(error.message).includes('duplicate') || String(error.code) === '23505') {
        return NextResponse.json({ error: 'Ese nombre ya está tomado.' }, { status: 409 })
      }
      throw error
    }
    return NextResponse.json({ ok: true, slug: body.data.slug })
  } catch (err) {
    console.error('[school-slug]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
