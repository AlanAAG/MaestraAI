// POST /api/auth/log-failure — best-effort telemetry for failed logins.
// Login runs client-side (supabase.auth.signInWithPassword), so the server never sees failures;
// the login page reports them here. Inserts require the service role (migration 013 removed user
// INSERT on failed_auth_attempts). Always returns 200 — never leaks whether an email exists.
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

const Schema = z.object({
  email: z.string().email().max(200),
  reason: z.string().min(1).max(60),
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const { success } = await checkRateLimit(ip, 'strict', 'auth-failure')
  if (!success) return NextResponse.json({ ok: true }) // silently drop when flooded

  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ ok: true })

  try {
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await service.from('failed_auth_attempts').insert({
      email: parsed.data.email.toLowerCase().trim(),
      ip_address: ip,
      user_agent: req.headers.get('user-agent'),
      reason: parsed.data.reason,
    })
  } catch (err) {
    console.error('[log-failure]', err)
  }
  return NextResponse.json({ ok: true })
}
