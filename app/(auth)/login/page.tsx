'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-text-disabled">o</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const fromDiary = params.get('from') === 'diary'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError('')
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) {
      setError(oauthError.message)
      setGoogleLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      // Best-effort security telemetry — fire and forget.
      fetch('/api/auth/log-failure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          reason: signInError.message.toLowerCase().includes('email not confirmed')
            ? 'email_not_confirmed'
            : signInError.message.toLowerCase().includes('invalid')
              ? 'invalid_credentials'
              : 'other',
        }),
      }).catch(() => {})
      if (signInError.message.toLowerCase().includes('email not confirmed')) {
        setError(
          'Aún no has confirmado tu correo electrónico. Revisa tu bandeja de entrada y haz clic en el enlace de confirmación.'
        )
        setLoading(false)
        setTimeout(() => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
        }, 3000)
        return
      }
      setError(
        signInError.message.toLowerCase().includes('invalid')
          ? 'Email o contraseña incorrectos. Por favor verifica tus datos.'
          : signInError.message
      )
      setLoading(false)
      return
    }

    if (fromDiary) {
      try {
        const pending = sessionStorage.getItem('pending_diary')
        if (pending) {
          const data = JSON.parse(pending)
          sessionStorage.removeItem('pending_diary')
          await fetch('/api/diary/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
        }
      } catch (e) {
        console.error('Failed to restore diary draft:', e)
      }
      router.push('/dashboard?diary=saved')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">MaestraIA</h1>
          <p className="text-text-secondary">Inicia sesión en tu cuenta</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            variant="outline"
            className="w-full min-h-[44px] flex items-center gap-2 justify-center"
          >
            <GoogleIcon />
            {googleLoading ? 'Redirigiendo...' : 'Continuar con Google'}
          </Button>

          <Divider />

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                className="min-h-[44px]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="min-h-[44px]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full min-h-[44px] bg-primary hover:bg-primary-dark"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>

          <p className="text-center text-sm text-text-secondary">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
