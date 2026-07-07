import Link from 'next/link'
import { SignOutButton } from './SignOutButton'

// Minimal shell for the family area — no teacher nav. Auth is enforced by middleware
// (/familia is protected; /familia/invitacion is public and renders its own full page).
export default function FamiliaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-surface border-b border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-text-primary">MaestraIA · Familia</span>
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
