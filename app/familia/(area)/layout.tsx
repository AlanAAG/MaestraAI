import Link from 'next/link'
import { SignOutButton } from './SignOutButton'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { grantsAccess } from '@/lib/parents/links'
import { getBrandForParent, type SchoolBrand } from '@/lib/school/brand'

// Minimal shell for the family area — no teacher nav. Auth is enforced by middleware
// (/familia is protected; /familia/invitacion is public and renders its own full page).
// White-label: when every linked child belongs to one school, its logo/name replaces MaestraIA.
export default async function FamiliaLayout({ children }: { children: React.ReactNode }) {
  let brand: SchoolBrand | null = null
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rawLinks } = await (supabase as any)
        .from('parent_links')
        .select('student_id, expires_at, claimed_at, revoked_at')
        .eq('parent_auth_id', user.id)
      const studentIds = (rawLinks ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((l: any) => grantsAccess(l))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((l: any) => l.student_id)
      brand = await getBrandForParent(createServiceClient(), studentIds)
    }
  } catch {
    /* default header */
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-surface border-b border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="flex items-center gap-3">
            {brand?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logoUrl} alt={brand.name} className="h-9 w-auto object-contain" />
            )}
            <span
              className="text-lg font-semibold text-text-primary"
              style={brand?.brandColor ? { color: brand.brandColor } : undefined}
            >
              {brand ? `${brand.name} · Familia` : 'MaestraIA · Familia'}
            </span>
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
      <footer className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-text-secondary">
        <Link href="/privacidad" className="hover:text-primary">
          Aviso de Privacidad
        </Link>
        <span className="mx-2">·</span>
        <span>© 2026 MaestraIA</span>
      </footer>
    </div>
  )
}
