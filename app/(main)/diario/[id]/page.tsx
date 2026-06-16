'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Share2, Trash2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/browser'

type Entry = {
  id: string
  week_start: string
  week_end: string
  ai_summary: string | null
  share_token: string | null
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

export default function DiarioDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    loadEntry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadEntry() {
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
    const { data, error } = await (supabase as any)
      .from('teacher_diary')
      .select('id, week_start, week_end, ai_summary, share_token')
      .eq('id', id)
      .eq('teacher_id', teacher.id)
      .single()
    if (error || !data) {
      router.push('/diario')
      return
    }
    setEntry(data)
    setLoading(false)
  }

  async function handleDownload() {
    if (!entry) return
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

  async function handleShare() {
    const res = await fetch(`/api/diary/${id}/share`, { method: 'POST' })
    if (!res.ok) {
      alert('No se pudo generar el enlace.')
      return
    }
    const { token } = (await res.json()) as { token: string }
    setShareUrl(`${window.location.origin}/compartir/${token}`)
  }

  async function handleCopy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este diario? Esta acción no se puede deshacer.')) return
    setDeleting(true)
    const res = await fetch(`/api/diary/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/diario')
    } else {
      setDeleting(false)
      alert('No se pudo eliminar. Inténtalo de nuevo.')
    }
  }

  if (loading) {
    return <div className="h-48 rounded-2xl bg-surface animate-pulse" />
  }

  if (!entry) return null

  return (
    <div className="max-w-2xl">
      <Link
        href="/diario"
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Mis diarios
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          {weekLabel(entry.week_start, entry.week_end)}
        </h1>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={handleDownload} className="min-h-[44px] gap-2">
            <Download size={16} />
            PDF
          </Button>
          <Button variant="outline" onClick={handleShare} className="min-h-[44px] gap-2">
            <Share2 size={16} />
            Compartir
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="min-h-[44px] text-red-500 hover:text-red-600 hover:border-red-300"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {shareUrl && (
        <div className="mb-6 p-4 rounded-xl bg-primary-light border border-primary/20">
          <p className="text-xs font-medium text-primary mb-2">
            Enlace para compartir (válido 7 días)
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 text-sm bg-white border border-[var(--color-border)] rounded-lg px-3 py-2 text-text-primary"
            />
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-white border border-[var(--color-border)] text-text-secondary hover:text-primary transition-colors"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      )}

      {entry.ai_summary && (
        <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-surface whitespace-pre-wrap text-text-primary leading-relaxed">
          {entry.ai_summary}
        </div>
      )}
    </div>
  )
}
