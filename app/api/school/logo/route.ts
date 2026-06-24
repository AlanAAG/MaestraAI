import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateBase64Image } from '@/lib/file-validation'

// The school logo lives as a base64 data URL on schools.logo_url and is shared by the school.

async function teacherSchool() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, schoolId: null as string | null }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id, school_id')
    .eq('auth_id', user.id)
    .single()
  return { user, schoolId: (teacher?.school_id as string) ?? null }
}

export async function GET() {
  try {
    const { user, schoolId } = await teacherSchool()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!schoolId) return NextResponse.json({ logo_url: null })

    const supabase = await createClient()
    // Resilient: returns null if the logo_url column isn't applied yet.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('schools')
      .select('logo_url')
      .eq('id', schoolId)
      .single()
    return NextResponse.json({ logo_url: error ? null : (data?.logo_url ?? null) })
  } catch {
    return NextResponse.json({ logo_url: null })
  }
}

const PutSchema = z.object({
  imageBase64: z.string(),
  imageMimeType: z.enum(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
})

export async function PUT(req: NextRequest) {
  try {
    const { user, schoolId } = await teacherSchool()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!schoolId) return NextResponse.json({ error: 'Sin escuela asignada' }, { status: 404 })

    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    const body = PutSchema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

    const validation = await validateBase64Image(body.data.imageBase64, body.data.imageMimeType)
    if (!validation.valid)
      return NextResponse.json({ error: validation.error ?? 'Imagen inválida' }, { status: 400 })

    const logo_url = `data:${body.data.imageMimeType};base64,${body.data.imageBase64}`

    // Service role: a teacher can set their school's logo; schools RLS may not allow direct writes.
    const svc = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (svc as any).from('schools').update({ logo_url }).eq('id', schoolId)
    if (error) return NextResponse.json({ error: 'No pude guardar el logo.' }, { status: 500 })

    return NextResponse.json({ ok: true, logo_url })
  } catch (err) {
    console.error('PUT /api/school/logo error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
