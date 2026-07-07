'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

// Accept button: logged-in users claim directly; everyone else goes to parent signup.
export function ClaimInvite({ token }: { token: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function accept() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push(`/register?parent_token=${token}`)
      return
    }
    const res = await fetch('/api/parent-links/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    if (res.ok) {
      router.push('/familia')
    } else {
      const d = await res.json().catch(() => null)
      setError(d?.error ?? 'No se pudo aceptar la invitación.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}
      <Button
        onClick={accept}
        disabled={loading}
        className="w-full min-h-[44px] bg-primary hover:bg-primary-dark"
      >
        {loading ? 'Un momento...' : 'Aceptar invitación'}
      </Button>
      <p className="text-sm text-text-secondary">
        ¿Ya tienes cuenta?{' '}
        <a href="/login" className="text-primary hover:underline font-medium">
          Inicia sesión
        </a>{' '}
        y vuelve a abrir este enlace.
      </p>
    </div>
  )
}
