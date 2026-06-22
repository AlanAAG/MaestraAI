'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'soporte@maestraia.com'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    // Check if user clicked email link
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/onboarding')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  async function handleResendEmail() {
    setResending(true)
    const supabase = createClient()

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })

    if (error) {
      alert('No pude reenviar el correo. Intenta de nuevo.')
    } else {
      setResent(true)
      setTimeout(() => setResent(false), 5000)
    }
    setResending(false)
  }

  async function handleCheckVerification() {
    setChecking(true)
    const supabase = createClient()

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      router.push('/onboarding')
    } else {
      alert(
        'Aún no has confirmado tu correo. Por favor revisa tu bandeja de entrada y haz clic en el enlace.'
      )
    }
    setChecking(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl p-8 border border-border shadow-sm">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Mail size={32} className="text-blue-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-text-primary text-center mb-2">
            Revisa tu correo electrónico
          </h1>
          <p className="text-text-secondary text-center mb-6">
            Te enviamos un correo a <strong>{email}</strong>
          </p>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-blue-900 text-sm mb-3 flex items-center gap-2">
              <CheckCircle size={18} />
              Sigue estos pasos:
            </h2>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                <span>Abre tu correo electrónico (Gmail, Outlook, etc.)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                <span>
                  Busca un correo de <strong>MaestraAI</strong> o <strong>Supabase</strong>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                <span>Haz clic en el botón de confirmar correo</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">4.</span>
                <span>Regresa aquí y da clic en &quot;Ya confirmé mi correo&quot;</span>
              </li>
            </ol>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <p className="text-xs text-yellow-800 flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                <strong>¿No ves el correo?</strong> Revisa tu carpeta de spam o correo no deseado. A
                veces llega ahí por error.
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleCheckVerification}
              disabled={checking}
              className="w-full min-h-[44px] bg-primary hover:bg-primary-dark"
            >
              {checking ? 'Verificando...' : 'Ya confirmé mi correo'}
            </Button>

            {resent ? (
              <div className="text-center text-sm text-green-600 font-medium">
                ✓ Correo reenviado. Revisa tu bandeja de entrada.
              </div>
            ) : (
              <Button
                onClick={handleResendEmail}
                disabled={resending}
                variant="outline"
                className="w-full min-h-[44px]"
              >
                {resending ? 'Reenviando...' : '¿No recibiste el correo? Reenviar'}
              </Button>
            )}
          </div>

          {/* Back to login */}
          <p className="text-center text-sm text-text-secondary mt-6">
            <Link href="/login" className="text-primary hover:underline font-medium">
              Volver a iniciar sesión
            </Link>
          </p>
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-text-secondary mt-6 px-4">
          Si tienes problemas, contacta a soporte:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-bg">
          <div className="text-text-secondary">Cargando...</div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
