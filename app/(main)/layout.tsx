import { BookOpen, CalendarDays, Home, Layers, Lock, Users } from 'lucide-react'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Inicio', pro: false },
  { href: '/diario', icon: BookOpen, label: 'Mi Diario', pro: false },
  { href: '/planeaciones', icon: CalendarDays, label: 'Planeaciones', pro: true },
  { href: '/material', icon: Layers, label: 'Material', pro: true },
  { href: '/grupo', icon: Users, label: 'Mi Grupo', pro: true },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
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
    </div>
  )
}
