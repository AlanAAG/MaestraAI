import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

// ponytail: service role bypasses RLS for public token lookup — no user session available
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  const { success } = await checkRateLimit(ip, 'relaxed')
  if (!success)
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
      { status: 429 }
    )

  const { token } = await params

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: entry } = await (supabaseAdmin as any)
    .from('teacher_diary')
    .select('week_start, week_end, ai_summary, share_expires_at')
    .eq('share_token', token)
    .single()

  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (entry.share_expires_at && new Date(entry.share_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 })
  }

  return NextResponse.json({
    week_start: entry.week_start,
    week_end: entry.week_end,
    ai_summary: entry.ai_summary,
  })
}
