'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { StreamingOutput } from '@/components/app/StreamingOutput'
import { ZeroState } from '@/components/app/ZeroState'
import { createClient } from '@/lib/supabase/browser'

const LS_KEY = 'maestraai_diary_draft'

function ResultadoContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [streamedText, setStreamedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasStarted = useRef(false)

  const q1 = params.get('q1') ?? ''
  const q2 = params.get('q2') ?? ''
  const q3 = params.get('q3') ?? ''
  const q4 = params.get('q4') ?? ''
  const q5 = params.get('q5') ?? ''
  const weekStart = params.get('weekStart') ?? ''
  const weekEnd = params.get('weekEnd') ?? ''

  useEffect(() => {
    if (hasStarted.current || !weekStart) return
    hasStarted.current = true
    generateSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function generateSummary() {
    setIsStreaming(true)
    setError(null)

    try {
      const res = await fetch('/api/diary/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q1, q2, q3, q4, q5, weekStart, weekEnd }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Error generando el resumen. Inténtalo de nuevo.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setStreamedText(accumulated)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.')
    } finally {
      setIsStreaming(false)
    }
  }

  async function handleDownloadPdf() {
    try {
      const res = await fetch('/api/diary/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, weekEnd, summaryText: streamedText }),
      })

      if (!res.ok) {
        alert('No se pudo generar el PDF. Inténtalo de nuevo.')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `diario-${weekStart}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      localStorage.removeItem(LS_KEY)
    } catch {
      alert('Error al descargar el PDF.')
    }
  }

  async function handleSave() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Already logged in — save directly
      const res = await fetch('/api/diary/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q1, q2, q3, q4, q5, weekStart, weekEnd, summaryText: streamedText }),
      })
      if (res.ok) {
        router.push('/dashboard?diary=saved')
      } else {
        alert('No se pudo guardar. Intenta de nuevo.')
      }
    } else {
      // Not logged in — stash draft and send to login
      sessionStorage.setItem(
        'pending_diary',
        JSON.stringify({ q1, q2, q3, q4, q5, weekStart, weekEnd, summaryText: streamedText })
      )
      router.push('/login?from=diary')
    }
  }

  if (!weekStart) {
    return (
      <ZeroState
        icon={BookOpen}
        title="No hay datos de diario"
        description="Regresa al inicio y responde las preguntas primero."
        ctaLabel="Ir al inicio"
        onCta={() => router.push('/diary')}
      />
    )
  }

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">Tu diario está listo</h1>
        <p className="text-sm text-text-secondary mt-1">
          Semana {weekStart} — {weekEnd}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
          <button onClick={generateSummary} className="block mt-2 font-semibold underline">
            Reintentar
          </button>
        </div>
      )}

      <StreamingOutput
        isStreaming={isStreaming}
        streamedText={streamedText}
        onDownloadPdf={streamedText ? handleDownloadPdf : undefined}
        onSave={streamedText ? handleSave : undefined}
      />

      {streamedText && (
        <p className="mt-6 text-sm text-center text-text-secondary">
          ¿Quieres guardar tu historial?{' '}
          <button onClick={handleSave} className="text-primary underline underline-offset-2">
            Inicia sesión o crea tu cuenta
          </button>
        </p>
      )}
    </main>
  )
}

export default function ResultadoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-text-secondary">
          Cargando...
        </div>
      }
    >
      <ResultadoContent />
    </Suspense>
  )
}
