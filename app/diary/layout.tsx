import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Diario de la Educadora — MaestraAI',
  description:
    'Genera tu diario pedagógico semanal en 5 minutos con IA. Gratis, sin registro. Para maestras de preescolar.',
  keywords:
    'diario de la educadora, diario preescolar NEM, diario pedagógico formato, maestra preescolar',
  openGraph: {
    title: 'Tu diario como maestra, en 5 minutos',
    description:
      'Responde 5 preguntas y obtén tu Diario de la Educadora listo para imprimir. Gratis.',
    siteName: 'MaestraAI',
    locale: 'es_MX',
    type: 'website',
  },
}

export default function DiaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-[var(--color-border)] bg-surface">
        <div className="max-w-app mx-auto px-4 sm:px-8 h-14 flex items-center justify-between">
          <span className="text-lg font-semibold text-text-primary">MaestraAI</span>
          <a
            href={process.env.NEXT_PUBLIC_APP_URL ?? '/'}
            className="text-sm text-primary hover:underline"
          >
            Iniciar sesión
          </a>
        </div>
      </header>
      {children}
    </div>
  )
}
