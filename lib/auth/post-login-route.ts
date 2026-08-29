/**
 * Where a freshly-authenticated user belongs.
 *
 * Single source of truth for post-auth routing — used by the login page (both on
 * submit and when an existing session is already present) and by /auth/callback,
 * so Google OAuth, email+password and email confirmation all land the same place.
 *
 * teachers → /dashboard · linked parents → /familia · brand-new accounts → /onboarding
 * A relative `next` wins when the user belongs there.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

/** Same-origin relative paths only — blocks open redirects via ?next= */
export function safeNextPath(next?: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : ''
}

export async function postLoginPath(
  supabase: AnySupabase,
  userId: string,
  next?: string | null
): Promise<string> {
  const safeNext = safeNextPath(next)

  try {
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('auth_id', userId)
      .maybeSingle()
    if (teacher) return safeNext || '/dashboard'

    // A parent invite/landing target is only honoured for non-teachers.
    if (safeNext.startsWith('/familia')) return safeNext

    const { data: links } = await supabase
      .from('parent_links')
      .select('id')
      .eq('parent_auth_id', userId)
      .is('revoked_at', null)
      .limit(1)
    if (links?.length) return '/familia'
  } catch {
    // Network/RLS hiccup — send them somewhere sane rather than stranding them.
    return safeNext || '/dashboard'
  }

  return '/onboarding'
}
