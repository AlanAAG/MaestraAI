import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Supabase OAuth callback — exchanges code for session, then routes new vs returning users
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  // Supabase redirects here with ?error= when the OAuth flow fails on their end
  const supabaseError = searchParams.get('error_code') ?? searchParams.get('error')
  if (supabaseError) {
    const desc = searchParams.get('error_description') ?? supabaseError
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(desc)}`)
  }

  const code = searchParams.get('code')
  // Only allow same-origin relative paths to prevent open-redirect via ?next=
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  // Check if teacher record exists (new vs returning user)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', data.session.user.id)
    .single()

  let destination = teacher ? next : '/onboarding'
  if (!teacher) {
    // Parents are not teachers: mid-invite OAuth carries next=/familia/invitacion/..., and
    // returning parents have a claimed parent_links row (RLS lets them read their own).
    if (next.startsWith('/familia')) {
      destination = next
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: links } = await (supabase as any)
        .from('parent_links')
        .select('id')
        .eq('parent_auth_id', data.session.user.id)
        .is('revoked_at', null)
        .limit(1)
      if (links?.length) destination = '/familia'
    }
  }
  return NextResponse.redirect(`${origin}${destination}`)
}
