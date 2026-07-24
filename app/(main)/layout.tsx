'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  BookOpen,
  CalendarDays,
  Home,
  Lock,
  Users,
  BookA,
  Package,
  Network,
  UserCircle,
  ClipboardList,
  MoreHorizontal,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { Toaster } from '@/components/ui/sonner'
import { getEditorialConfig } from '@/lib/editorial/registry'
import { InitialsAvatar } from '@/components/ui/InitialsAvatar'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { TeacherNameProvider } from '@/components/app/TeacherContext'
import { appFontStyle } from '@/lib/design/fonts'
import { appThemeVars } from '@/lib/design/themes'
import { writeDesignCookie } from '@/lib/design/vars'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Home, label: 'Inicio' },
  { href: '/diario', icon: BookOpen, label: 'Mi Diario' },
  { href: '/planeaciones', icon: CalendarDays, label: 'Planeaciones' },
  { href: '/vocabulario', icon: BookA, label: 'Vocabulario' },
  { href: '/materiales', icon: Package, label: 'Materiales' },
  { href: '/alumnos', icon: Users, label: 'Alumnos' },
  { href: '/calificaciones-richmond', icon: ClipboardList, label: 'Calificaciones' },
  { href: '/red', icon: Network, label: 'Mi Escuela' },
  { href: '/perfil', icon: UserCircle, label: 'Mi Perfil' },
  { href: '/configuracion', icon: Lock, label: 'Configuración' },
]

// Calificaciones is Richmond-only — hidden when the teacher's editorial has no LMS sync.
const LMS_ONLY_HREFS = ['/calificaciones-richmond']

// First 4 items in bottom nav + "Más" as 5th
const BOTTOM_PRIMARY = ['/dashboard', '/planeaciones', '/calificaciones-richmond', '/diario']

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [showMore, setShowMore] = useState(false)
  const [hasLmsSync, setHasLmsSync] = useState(false)
  const [teacherName, setTeacherName] = useState('')
  const [appFont, setAppFont] = useState<string | null>(null)
  const [appColor, setAppColor] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher } = await (supabase as any)
        .from('teachers')
        .select('id, editorial, full_name, design_settings')
        .eq('auth_id', user.id)
        .maybeSingle()

      if (!teacher) {
        // Parents (no teachers row) belong in /familia, not the teacher onboarding.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: links } = await (supabase as any)
          .from('parent_links')
          .select('id')
          .eq('parent_auth_id', user.id)
          .is('revoked_at', null)
          .limit(1)
        router.push(links?.length ? '/familia' : '/onboarding')
        return
      }

      setHasLmsSync(getEditorialConfig(teacher.editorial).has_lms_sync)
      setTeacherName(teacher.full_name || '')
      setAppFont(teacher.design_settings?.app_font ?? null)
      setAppColor(teacher.design_settings?.app_color ?? null)
      // Keep the pre-paint cookie in sync with the DB so future loads apply the theme flash-free.
      writeDesignCookie(teacher.design_settings?.app_color, teacher.design_settings?.app_font)
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

  // App-wide font applied at the document root — reaches every component, game, and any
  // portal-rendered overlay (a wrapper-div override would miss those). Cleaned up on exit.
  useEffect(() => {
    const style = appFontStyle(appFont)
    if (!style) return
    const root = document.documentElement
    const stack = style.fontFamily as string
    root.style.setProperty('--font-inter', stack)
    root.style.setProperty('--font-dm-sans', stack)
    root.style.fontFamily = stack
    return () => {
      root.style.removeProperty('--font-inter')
      root.style.removeProperty('--font-dm-sans')
      root.style.fontFamily = ''
    }
  }, [appFont])

  // App-wide color theme applied at the document root — a full environment shift (brand,
  // surfaces, shadcn tokens). Cleaned up on exit so a theme change fully reverts.
  useEffect(() => {
    const vars = appThemeVars(appColor)
    if (!vars) return
    const root = document.documentElement
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
    return () => {
      for (const k of Object.keys(vars)) root.style.removeProperty(k)
    }
  }, [appColor])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-text-secondary">Cargando...</div>
      </div>
    )
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const navItems = NAV_ITEMS.filter((n) => hasLmsSync || !LMS_ONLY_HREFS.includes(n.href))
  const bottomPrimary = navItems.filter((n) => BOTTOM_PRIMARY.includes(n.href))
  const bottomMore = navItems.filter((n) => !BOTTOM_PRIMARY.includes(n.href))

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-60 border-r border-[var(--color-border)] bg-surface py-6 px-3 gap-1 shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="px-3 mb-6">
          <span className="font-display text-lg font-semibold text-text-primary">MaestraIA</span>
        </div>
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm transition-colors duration-150 ${
              isActive(href)
                ? 'bg-brand-subtle text-brand font-medium'
                : 'text-text-secondary font-normal hover:bg-inset hover:text-text-primary'
            }`}
          >
            <Icon size={20} strokeWidth={1.75} />
            {label}
          </Link>
        ))}

        {/* Identity footer — "this is my workspace" */}
        <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2.5 px-1">
            <Link href="/perfil" className="flex items-center gap-2.5 min-w-0 flex-1 group">
              <InitialsAvatar name={teacherName} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text-primary group-hover:text-brand transition-colors">
                  {teacherName || 'Mi perfil'}
                </span>
                <span className="block text-xs text-text-muted">Ver mi perfil</span>
              </span>
            </Link>
            <SignOutButton variant="icon" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-bg pb-20 md:pb-0">
        <div className="max-w-app mx-auto px-4 sm:px-8 md:px-16 py-8">
          <TeacherNameProvider name={teacherName}>{children}</TeacherNameProvider>
        </div>

        {/* Footer */}
        <footer className="max-w-app mx-auto px-4 sm:px-8 md:px-16 py-6 text-center text-sm text-text-secondary border-t border-[var(--color-border)] mt-12">
          <Link href="/privacidad" className="hover:text-brand transition-colors duration-150">
            Aviso de Privacidad
          </Link>
          <span className="mx-2">·</span>
          <Link href="/terminos" className="hover:text-brand transition-colors duration-150">
            Términos de Servicio
          </Link>
          <span className="mx-2">·</span>
          <span>© 2026 MaestraIA</span>
        </footer>
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-[var(--color-border)] flex z-50">
        {bottomPrimary.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150 ${
              isActive(href) ? 'text-brand' : 'text-text-secondary'
            }`}
          >
            <Icon size={22} strokeWidth={1.75} />
            {label}
          </Link>
        ))}
        {/* Más button */}
        <button
          onClick={() => setShowMore((v) => !v)}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150 ${
            showMore ? 'text-brand' : 'text-text-secondary'
          }`}
          aria-label="Más opciones"
        >
          {showMore ? (
            <X size={22} strokeWidth={1.75} />
          ) : (
            <MoreHorizontal size={22} strokeWidth={1.75} />
          )}
          Más
        </button>
      </nav>

      {/* More sheet — mobile only */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-[rgba(61,52,39,0.4)]"
            onClick={() => setShowMore(false)}
          />
          {/* Sheet */}
          <div className="md:hidden fixed bottom-[64px] left-0 right-0 bg-surface border-t border-[var(--color-border)] rounded-t-2xl p-4 z-40 shadow-lg">
            <div className="grid grid-cols-3 gap-2">
              {bottomMore.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setShowMore(false)}
                  className={`flex flex-col items-center gap-2 py-3 px-2 rounded-sm text-[11px] font-medium transition-colors duration-150 ${
                    isActive(href)
                      ? 'bg-brand-subtle text-brand'
                      : 'text-text-secondary hover:bg-inset hover:text-text-primary'
                  }`}
                >
                  <Icon size={24} strokeWidth={1.75} />
                  {label}
                </Link>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
              <Link
                href="/perfil"
                onClick={() => setShowMore(false)}
                className="flex items-center gap-2.5 min-w-0"
              >
                <InitialsAvatar name={teacherName} size={32} />
                <span className="truncate text-sm font-medium text-text-primary">
                  {teacherName || 'Mi perfil'}
                </span>
              </Link>
              <SignOutButton variant="button" />
            </div>
          </div>
        </>
      )}

      <Toaster />
    </div>
  )
}
