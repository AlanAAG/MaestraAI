import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

type Props = { params: Promise<{ token: string }> }

function weekLabel(weekStart: string, weekEnd: string) {
  const s = new Date(weekStart + 'T12:00:00')
  const e = new Date(weekEnd + 'T12:00:00')
  const months = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ]
  return `Semana del ${s.getDate()} al ${e.getDate()} de ${months[e.getMonth()]} ${e.getFullYear()}`
}

export default async function CompartirPage({ params }: Props) {
  const { token } = await params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: entry } = await (supabase as any)
    .from('teacher_diary')
    .select('week_start, week_end, ai_summary, share_expires_at')
    .eq('share_token', token)
    .single()

  const expired = entry?.share_expires_at && new Date(entry.share_expires_at) < new Date()

  if (!entry || expired) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
        <BookOpen size={48} className="text-text-disabled mb-4" />
        <h1 className="text-xl font-semibold text-text-primary mb-2">
          {expired ? 'Enlace expirado' : 'Enlace no encontrado'}
        </h1>
        <p className="text-sm text-text-secondary">
          {expired
            ? 'Este diario ya no está disponible públicamente.'
            : 'El enlace que usaste no es válido.'}
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-8">
          <BookOpen size={20} className="text-primary" />
          <span className="text-sm font-medium text-primary">MaestraAI — Diario Docente</span>
        </div>

        <h1 className="text-2xl font-semibold text-text-primary mb-2">
          {weekLabel(entry.week_start, entry.week_end)}
        </h1>
        <p className="text-xs text-text-disabled mb-8">Compartido por una maestra de MaestraAI</p>

        {entry.ai_summary && (
          <div className="p-6 rounded-2xl border border-gray-200 whitespace-pre-wrap text-gray-800 leading-relaxed">
            {entry.ai_summary}
          </div>
        )}

        <p className="mt-8 text-xs text-center text-text-disabled">
          ¿Eres maestra?{' '}
          <Link href="/register" className="text-primary underline underline-offset-2">
            Crea tu cuenta gratis en MaestraAI
          </Link>
        </p>
      </div>
    </main>
  )
}
