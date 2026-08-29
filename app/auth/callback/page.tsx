'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { postLoginPath, safeNextPath } from '@/lib/auth/post-login-route'

function AuthCallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true

    const supabase = createClient()
    const code = params.get('code')
    const safeNext = safeNextPath(params.get('next'))
    const errorCode = params.get('error_code') ?? params.get('error')

    if (errorCode) {
      const desc = params.get('error_description') ?? errorCode
      router.replace(`/login?error=${encodeURIComponent(desc)}`)
      return
    }

    if (code) {
      // PKCE (default). The verifier lives in a cookie written by signInWithOAuth /
      // signUp on this origin — so this only fails when the link is opened in a
      // different browser than it was started in, or the cookie was dropped.
      supabase.auth
        .exchangeCodeForSession(code)
        .then(async ({ data, error }) => {
          if (error || !data.session) {
            // Surface the real reason instead of always claiming "email verified" —
            // that message sent Google sign-in users into a silent loop.
            console.error('[auth/callback] code exchange failed:', error?.message)
            router.replace(
              `/login?verified=1${error?.message ? `&error=${encodeURIComponent(error.message)}` : ''}`
            )
            return
          }
          router.replace(await postLoginPath(supabase, data.session.user.id, safeNext))
        })
        .catch((e) => {
          console.error('[auth/callback] code exchange threw:', e)
          router.replace('/login?verified=1')
        })
      return
    }

    // No code param — wait for session from hash (email magic link / implicit flow).
    // The Supabase client auto-detects it; we just wait for SIGNED_IN.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        router.replace(await postLoginPath(supabase, session.user.id, safeNext))
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

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-text-muted font-sans text-sm animate-pulse">Verificando cuenta…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}
