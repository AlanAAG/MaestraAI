'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BookOpen, Calendar, FileText, Settings, Database, LogOut } from 'lucide-react'
import Link from 'next/link'

const NAV_ITEMS = [
  { icon: Calendar, label: 'Dashboard', href: '/dashboard' },
  { icon: BookOpen, label: 'Planeaciones', href: '/planeaciones' },
  { icon: FileText, label: 'Boletas', href: '/boletas' },
  { icon: Database, label: 'Richmond', href: '/dashboard/richmond' },
  { icon: Settings, label: 'Configuración', href: '/configuracion' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-text-secondary">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-border flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-text-primary">MaestraAI</h1>
          <p className="text-xs text-text-secondary mt-1">{user?.email}</p>
        </div>

        <nav className="flex-1 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-primary-light text-primary font-medium'
                    : 'text-text-secondary hover:bg-primary-light hover:text-text-primary'
                }`}
              >
                <Icon size={20} strokeWidth={1.75} />
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-text-secondary hover:bg-primary-light hover:text-text-primary transition-colors"
          >
            <LogOut size={20} strokeWidth={1.75} />
            <span className="text-sm">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
