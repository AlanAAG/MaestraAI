'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen, Plus, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/browser'
import { ZeroState } from '@/components/app/ZeroState'

type DiaryEntry = {
  id: string
  week_start: string
  week_end: string
  ai_summary: string | null
}

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

export default function DiarioPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('teacher_diary')
      .select('id, week_start, week_end, ai_summary')
      .eq('teacher_id', teacher.id)
      .order('week_start', { ascending: false })
    setEntries(data ?? [])
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este diario? Esta acción no se puede deshacer.')) return
    const res = await fetch(`/api/diary/${id}`, { method: 'DELETE' })
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  async function handleDownload(entry: DiaryEntry) {
    const res = await fetch('/api/diary/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStart: entry.week_start,
        weekEnd: entry.week_end,
        summaryText: entry.ai_summary ?? '',
      }),
    })
    if (!res.ok) {
      alert('No se pudo generar el PDF.')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diario-${entry.week_start}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-surface animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Mi Diario</h1>
          <p className="text-sm text-text-secondary mt-1">
            Reflexiones semanales de tu práctica docente
          </p>
        </div>
        <Link href="/diario/nueva">
          <Button className="min-h-[44px] gap-2">
            <Plus size={18} />
            Nueva entrada
          </Button>
        </Link>
      </div>

      {entries.length === 0 ? (
        <ZeroState
          icon={BookOpen}
          title="Aún no tienes entradas de diario"
          description="Registra tu primera semana. Solo toma 5 minutos."
          ctaLabel="Escribir mi primer diario"
          onCta={() => router.push('/diario/nueva')}
        />
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="p-5 rounded-2xl border border-[var(--color-border)] bg-surface"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/diario/${entry.id}`}
                    className="font-semibold text-text-primary hover:text-primary transition-colors"
                  >
                    {weekLabel(entry.week_start, entry.week_end)}
                  </Link>
                  {entry.ai_summary && (
                    <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                      {entry.ai_summary.slice(0, 200)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDownload(entry)}
                    className="p-2 rounded-lg text-text-secondary hover:text-primary hover:bg-primary-light transition-colors"
                    title="Descargar PDF"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
