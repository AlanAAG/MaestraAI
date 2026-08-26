// app/layout.tsx
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { Fredoka, Nunito } from 'next/font/google'
import './globals.css'
import { DESIGN_INIT_SCRIPT } from '@/lib/design/vars'

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
})

export function generateMetadata(): Metadata {
  return {
    title: 'MaestraIA',
    description: 'Tu asistente de planeación y materiales para preescolar',
    other: {
      ...Sentry.getTraceData(),
    },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="font-sans antialiased">
        {/* Applies the teacher's saved color theme + font BEFORE paint (no flash of default). */}
        <script dangerouslySetInnerHTML={{ __html: DESIGN_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  )
}
