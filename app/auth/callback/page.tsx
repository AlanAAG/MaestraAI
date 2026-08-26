'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

async function routeSession(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  safeNext: string,
  router: ReturnType<typeof useRouter>
) {
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('auth_id', userId)
    .single()

  if (teacher) {
    router.replace(safeNext || '/dashboard')
    return
  }
  if (safeNext.startsWith('/familia')) {
    router.replace(safeNext)
    return
  }
  const { data: links } = await supabase
    .from('parent_links')
    .select('id')
    .eq('parent_auth_id', userId)
    .is('revoked_at', null)
    .limit(1)
  router.replace(links?.length ? '/familia' : '/onboarding')
}

// Handles PKCE (?code=) and implicit (#access_token=) email confirmation flows.
// Client-side so the browser Supabase client can read the code_verifier from
// its own storage — server-side exchange fails cross-browser.
export default function AuthCallbackPage() {
  const router = useRouter()
  const params = useSearchParams()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const supabase = createClient()
    const code = params.get('code')
    const next = params.get('next') ?? ''
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : ''
    const errorCode = params.get('error_code') ?? params.get('error')

    if (errorCode) {
      const desc = params.get('error_description') ?? errorCode
      router.replace(`/login?error=${encodeURIComponent(desc)}`)
      return
    }

    if (code) {
      // PKCE flow (default Supabase)
      supabase.auth
        .exchangeCodeForSession(code)
        .then(async ({ data, error }) => {
          if (error || !data.session) {
            // Code verifier mismatch — email is verified, just needs sign-in
            router.replace('/login?verified=1')
            return
          }
          await routeSession(supabase, data.session.user.id, safeNext, router)
        })
        .catch(() => router.replace('/login?verified=1'))
      return
    }

    // Implicit flow (PKCE disabled in Supabase dashboard) — session arrives via hash.
    // The Supabase client auto-detects it; we just wait for SIGNED_IN.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        await routeSession(supabase, session.user.id, safeNext, router)
      }
    })

    // Fallback: if no code and no hash event after 4s, prompt sign-in
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      router.replace('/login?verified=1')
    }, 4000)

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [params, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-text-muted font-sans text-sm animate-pulse">Verificando cuenta…</p>
    </div>
  )
}
