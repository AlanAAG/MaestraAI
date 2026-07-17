'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  /** 'link' = plain text (default), 'button' = bordered secondary, 'icon' = icon-only. */
  variant?: 'link' | 'button' | 'icon'
  label?: string
  className?: string
}

export function SignOutButton({
  variant = 'link',
  label = 'Cerrar sesión',
  className = '',
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function signOut() {
    setLoading(true)
    await createClient().auth.signOut()
    router.push('/login')
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={loading}
        aria-label={label}
        title={label}
        className={`p-1.5 rounded-sm text-text-muted hover:bg-inset hover:text-text-primary transition-colors ${className}`}
      >
        <LogOut size={18} strokeWidth={1.75} />
      </button>
    )
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-sm border border-border-strong px-4 py-2 text-sm font-medium text-text-secondary hover:bg-inset transition-colors active:scale-[0.98] ${className}`}
      >
        <LogOut size={16} strokeWidth={1.75} />
        {loading ? 'Saliendo…' : label}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={loading}
      className={`inline-flex items-center gap-2 text-sm text-text-secondary hover:text-brand transition-colors ${className}`}
    >
      <LogOut size={16} strokeWidth={1.75} />
      {loading ? 'Saliendo…' : label}
    </button>
  )
}
