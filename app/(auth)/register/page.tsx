'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consentPrimary, setConsentPrimary] = useState(false)
  const [consentSecondary, setConsentSecondary] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

    // Store consent choices for recording after teacher record is created in onboarding
    localStorage.setItem(
      'pendingConsents',
      JSON.stringify({
        consentPrimary,
        consentSecondary,
        userAgent: navigator.userAgent,
      })
    )

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

    // Check if email confirmation is required
    if (data?.user && !data.session) {
      // Email confirmation required - show clear message
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
    } else {
      // No email confirmation required (auto-confirm enabled) - proceed to onboarding
      router.push('/onboarding')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">MaestraAI</h1>
          <p className="text-text-secondary">Crea tu cuenta</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

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

          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentPrimary}
                onChange={(e) => setConsentPrimary(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-secondary">
                Acepto el tratamiento de mis datos para usar MaestraAI conforme al{' '}
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

          <Button
            type="submit"
            disabled={loading || !consentPrimary}
            className="w-full min-h-[44px] bg-primary hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>

          <p className="text-center text-sm text-text-secondary">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
