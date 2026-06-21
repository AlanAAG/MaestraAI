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

function RegisterForm() {
  const router = useRouter()
  const params = useSearchParams()
  const type = params.get('type') === 'school' ? 'school' : 'teacher'
  const isSchool = type === 'school'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consentPrimary, setConsentPrimary] = useState(false)
  const [consentSecondary, setConsentSecondary] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  function storeConsent() {
    localStorage.setItem(
      'pendingConsents',
      JSON.stringify({
        consentPrimary,
        consentSecondary,
        userAgent: navigator.userAgent,
        role: type,
      })
    )
  }

  async function handleGoogleRegister() {
    if (!consentPrimary) {
      setError('Debes aceptar el Aviso de Privacidad antes de continuar con Google')
      return
    }
    setGoogleLoading(true)
    setError('')
    storeConsent()
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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    if (!consentPrimary) {
      setError('Debes aceptar el tratamiento de tus datos para continuar')
      setLoading(false)
      return
    }

    storeConsent()

    const supabase = createClient()
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/onboarding`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data?.user && !data.session) {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`)
    } else {
      router.push('/onboarding')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">MaestraAI</h1>
          <p className="text-text-secondary">
            {isSchool ? 'Crea una cuenta institucional' : 'Crea tu cuenta de maestra'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Consent checkboxes — required before ANY signup method */}
        <div className="space-y-3 mb-5 p-4 rounded-lg bg-muted border border-border">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wide">
            Antes de continuar
          </p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentPrimary}
              onChange={(e) => setConsentPrimary(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-secondary">
              Acepto el tratamiento de mis datos conforme al{' '}
              <Link href="/privacidad" className="text-primary hover:underline" target="_blank">
                Aviso de Privacidad
              </Link>{' '}
              <span className="text-red-500">*</span>
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentSecondary}
              onChange={(e) => setConsentSecondary(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-secondary">
              Acepto análisis anónimo para mejora del servicio (opcional)
            </span>
          </label>
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            onClick={handleGoogleRegister}
            disabled={googleLoading || loading}
            variant="outline"
            className="w-full min-h-[44px] flex items-center gap-2 justify-center"
          >
            <GoogleIcon />
            {googleLoading ? 'Redirigiendo...' : 'Registrarse con Google'}
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-disabled">o con email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
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
                placeholder="Mínimo 6 caracteres"
                required
                className="min-h-[44px]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !consentPrimary || googleLoading}
              className="w-full min-h-[44px] bg-primary hover:bg-primary-dark disabled:opacity-50"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="text-center text-sm text-text-secondary">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
