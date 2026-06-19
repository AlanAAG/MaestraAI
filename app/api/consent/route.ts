import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

const ConsentSchema = z
  .object({
    consentPrimary: z.boolean().optional(),
    consentSecondary: z.boolean().optional(),
    userAgent: z.string().max(500).optional().default(''),
    consentStudentData: z.boolean().optional(),
  })
  .refine((d) => d.consentPrimary !== undefined || d.consentStudentData !== undefined, {
    message: 'At least one consent field is required',
  })

export async function POST(req: NextRequest) {
  const { success: rateLimitOk } = await checkRateLimit(
    req.headers.get('x-real-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      'unknown',
    'standard'
  )
  if (!rateLimitOk)
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
      { status: 429 }
    )

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = ConsentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (!teacher) {
    return NextResponse.json({ error: 'Perfil de maestra no encontrado' }, { status: 404 })
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || null

  const { consentPrimary, consentSecondary, userAgent, consentStudentData } = parsed.data

  const meta = { teacher_id: teacher.id, ip_address: ip, user_agent: userAgent }
  const rows: (typeof meta)[] & { consent_type: string; granted: boolean }[] = []

  if (consentPrimary !== undefined) {
    rows.push({ ...meta, consent_type: 'primary_purposes', granted: consentPrimary })
  }
  if (consentSecondary !== undefined) {
    rows.push({ ...meta, consent_type: 'secondary_purposes', granted: consentSecondary })
  }
  if (consentStudentData !== undefined) {
    rows.push({ ...meta, consent_type: 'student_data_transfer', granted: consentStudentData })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase as any).from('consent_records').insert(rows)

  if (insertError) {
    console.error('Failed to record consents:', insertError)
    return NextResponse.json({ error: 'Error al registrar consentimientos' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
