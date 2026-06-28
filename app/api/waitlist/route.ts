import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Public waitlist signup — email + grade. Uses the service role (no user session); RLS keeps the
// table private. Returns the signer's position + ref_code so the UI can show "estás en el #N".
const Schema = z.object({
  email: z.string().email().max(200),
  grade: z.string().max(40).optional(),
  ref: z.string().max(40).optional(), // referrer's ref_code, if they arrived via a referral link
})

const shortCode = () => Math.random().toString(36).slice(2, 10)

export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Correo inválido' }, { status: 400 })
  }
  const { email, grade, ref } = parsed.data

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Resolve the referrer (best-effort).
  let referred_by: string | null = null
  if (ref) {
    const { data: r } = await supabase.from('waitlist').select('id').eq('ref_code', ref).single()
    referred_by = r?.id ?? null
  }

  const ref_code = shortCode()
  const { data: inserted, error } = await supabase
    .from('waitlist')
    .insert({ email: email.toLowerCase().trim(), grade: grade ?? null, ref_code, referred_by })
    .select('id, ref_code, created_at')
    .single()

  // Already on the list → return their existing entry instead of erroring (idempotent UX).
  let row = inserted
  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('waitlist')
        .select('id, ref_code, created_at')
        .eq('email', email.toLowerCase().trim())
        .single()
      row = existing ?? null
    }
    if (!row) {
      console.error('[waitlist]', error.message)
      return NextResponse.json({ error: 'No pude registrarte. Intenta de nuevo.' }, { status: 500 })
    }
  }

  // Position = how many signed up at or before this row.
  const { count } = await supabase
    .from('waitlist')
    .select('id', { count: 'exact', head: true })
    .lte('created_at', row!.created_at)

  return NextResponse.json({ position: count ?? 1, ref_code: row!.ref_code })
}
