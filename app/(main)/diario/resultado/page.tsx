'use client'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { StreamingOutput } from '@/components/app/StreamingOutput'
import { ZeroState } from '@/components/app/ZeroState'

const LS_KEY = 'maestraai_diary_draft'

function ResultadoContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [streamedText, setStreamedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasStarted = useRef(false)
  const hasSaved = useRef(false)

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
    hasSaved.current = false

    try {
      const res = await fetch('/api/diary/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q1, q2, q3, q4, q5, weekStart, weekEnd }),
      })

      if (!res.ok || !res.body) throw new Error('Error generando el resumen. Inténtalo de nuevo.')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setStreamedText(accumulated)
      }

      setIsStreaming(false)
      await autoSave(accumulated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.')
      setIsStreaming(false)
    }
  }

  async function autoSave(summaryText: string) {
    if (hasSaved.current) return
    hasSaved.current = true
    setIsSaving(true)

    try {
      const res = await fetch('/api/diary/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q1, q2, q3, q4, q5, weekStart, weekEnd, summaryText }),
      })
      if (!res.ok) throw new Error('save failed')
      const { id } = (await res.json()) as { id: string }
      localStorage.removeItem(LS_KEY)
      router.push(`/diario/${id}`)
    } catch {
      setIsSaving(false)
      hasSaved.current = false
      setError('Tu diario se generó pero no se pudo guardar. Inténtalo de nuevo.')
    }
  }

  if (!weekStart) {
    return (
      <ZeroState
        icon={BookOpen}
        title="No hay datos de diario"
        description="Regresa al inicio y responde las preguntas primero."
        ctaLabel="Ir al inicio"
        onCta={() => router.push('/diario/nueva')}
      />
    )
  }

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text-primary">
          {isStreaming
            ? 'Generando tu diario...'
            : isSaving
              ? 'Guardando...'
              : 'Tu diario está listo'}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Semana {weekStart} — {weekEnd}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
          <button
            onClick={() => {
              hasStarted.current = false
              generateSummary()
            }}
            className="block mt-2 font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      )}

      <StreamingOutput isStreaming={isStreaming} streamedText={streamedText} />

      {isSaving && (
        <p className="mt-4 text-sm text-center text-text-secondary animate-pulse">
          Guardando en tu historial...
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
