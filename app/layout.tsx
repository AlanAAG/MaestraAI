// app/layout.tsx
import * as Sentry from '@sentry/nextjs'
import type { Metadata } from 'next'
import { DM_Sans, Inter } from 'next/font/google'
import './globals.css'
import { DESIGN_INIT_SCRIPT } from '@/lib/design/vars'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
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
    <html lang="es" className={`${inter.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased">
        {/* Applies the teacher's saved color theme + font BEFORE paint (no flash of default). */}
        <script dangerouslySetInnerHTML={{ __html: DESIGN_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  )
}
