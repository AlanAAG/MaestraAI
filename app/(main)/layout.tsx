'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, CalendarDays, Home, Lock, Users, BookA, Package } from 'lucide-react'
import Link from 'next/link'
import { Toaster } from '@/components/ui/sonner'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Inicio', pro: false },
  { href: '/diary', icon: BookOpen, label: 'Mi Diario', pro: false },
  { href: '/planeaciones', icon: CalendarDays, label: 'Planeaciones', pro: false },
  { href: '/vocabulario', icon: BookA, label: 'Vocabulario', pro: false },
  { href: '/materiales', icon: Package, label: 'Materiales', pro: false },
  { href: '/alumnos', icon: Users, label: 'Alumnos', pro: false },
  { href: '/configuracion', icon: Lock, label: 'Configuración', pro: false },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }

      // Check if teacher record exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id')
        .eq('auth_id', user.id)
        .maybeSingle()

      if (!teacher) {
        // No teacher record = onboarding not completed
        router.push('/onboarding')
        return
      }

      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-text-secondary">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-60 border-r border-[var(--color-border)] bg-surface py-6 px-3 gap-1 shrink-0">
        <div className="px-3 mb-6">
          <span className="text-lg font-semibold text-text-primary">MaestraAI</span>
        </div>
        {NAV_ITEMS.map(({ href, icon: Icon, label, pro }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
              text-text-secondary hover:bg-primary-light hover:text-primary transition-colors duration-150"
          >
            <Icon size={20} strokeWidth={1.75} />
            {label}
            {pro && <Lock size={12} className="ml-auto text-text-disabled" />}
          </Link>
        ))}
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-bg">
        <div className="max-w-app mx-auto px-4 sm:px-8 md:px-16 py-8">{children}</div>

        {/* Footer */}
        <footer className="max-w-app mx-auto px-4 sm:px-8 md:px-16 py-6 text-center text-sm text-text-secondary border-t border-[var(--color-border)] mt-12">
          <Link href="/privacidad" className="hover:text-primary transition-colors duration-150">
            Aviso de Privacidad
          </Link>
          <span className="mx-2">•</span>
          <span>© 2026 MaestraAI</span>
        </footer>
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-[var(--color-border)] flex z-50">
        {NAV_ITEMS.slice(0, 4).map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium
              text-text-secondary hover:text-primary transition-colors duration-150"
          >
            <Icon size={22} strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </nav>

      <Toaster />
    </div>
  )
}
