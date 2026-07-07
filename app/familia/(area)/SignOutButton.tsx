'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()
  return (
    <button
      onClick={async () => {
        await createClient().auth.signOut()
        router.push('/login')
      }}
      className="text-sm text-text-secondary hover:text-primary transition-colors"
    >
      Salir
    </button>
  )
}
