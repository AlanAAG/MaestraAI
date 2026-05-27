'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      // Check if error is because email is not confirmed
      if (signInError.message.toLowerCase().includes('email not confirmed')) {
        setError(
          'Aún no has confirmado tu correo electrónico. Revisa tu bandeja de entrada y haz clic en el enlace de confirmación.'
        )
        setLoading(false)
        // Redirect to verify email page after 3 seconds
        setTimeout(() => {
          router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
        }, 3000)
        return
      }

      // Other errors - show friendly message
      if (signInError.message.toLowerCase().includes('invalid')) {
        setError('Email o contraseña incorrectos. Por favor verifica tus datos.')
      } else {
        setError(signInError.message)
      }
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">MaestraAI</h1>
          <p className="text-text-secondary">Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
              placeholder="••••••••"
              required
              className="min-h-[44px]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] bg-primary hover:bg-primary-dark"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>

          <p className="text-center text-sm text-text-secondary">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Regístrate
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
