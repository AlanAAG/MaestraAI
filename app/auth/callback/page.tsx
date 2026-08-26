'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Handles both email-confirmation PKCE codes and Google OAuth codes.
// Client-side so the browser Supabase client can read the code_verifier it
// stored in cookies during signUp() — server-side exchange fails when the
// email is opened in a different browser context.
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

    if (!code) {
      router.replace('/login?error=missing_code')
      return
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(async ({ data, error }) => {
        if (error || !data.session) {
          router.replace(`/login?error=${encodeURIComponent(error?.message ?? 'oauth_failed')}`)
          return
        }

        // Determine destination: new teacher → onboarding, parent → /familia, else next or dashboard
        const { data: teacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('auth_id', data.session.user.id)
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
          .eq('parent_auth_id', data.session.user.id)
          .is('revoked_at', null)
          .limit(1)

        router.replace(links?.length ? '/familia' : '/onboarding')
      })
      .catch(() => router.replace('/login?error=oauth_failed'))
  }, [params, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-text-muted font-sans text-sm animate-pulse">Verificando cuenta…</p>
    </div>
  )
}
