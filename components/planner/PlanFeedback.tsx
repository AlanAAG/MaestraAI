'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Star, Loader2, RefreshCw, Check } from 'lucide-react'

// Explicit feedback UI for a generated plan: a global stars row + Word-style per-section
// comments. Invisible until used, print:hidden always — the document design stays untouched.

type FeedbackState = {
  fortnightId: string
  rating: number | null
  globalComment: string
  sectionComments: Record<string, string>
  openSection: string | null
  busySection: string | null
  setOpenSection: (k: string | null) => void
  saveGlobal: (rating: number, comment: string) => Promise<void>
  saveSection: (key: string, comment: string) => Promise<void>
  regenerateSection: (key: string, comment: string) => Promise<void>
}

const Ctx = createContext<FeedbackState | null>(null)

// Sections that accept comments — mirror FEEDBACK_SECTIONS (lib/planner/feedback.ts is
// server-adjacent; re-declared here to keep the client bundle lean, same pattern as
// DEFAULT_QUINCENA_ORDER).
export const COMMENTABLE = new Set([
  'actividades_iniciales',
  'actividades_rutina',
  'aventura_lectora',
  'estrategia_comunitaria',
  'pausas_activas',
  'ajustes_razonables',
  'ejes_articuladores',
  'proyecto',
  'desarrollo_taller',
])

export function PlanFeedbackProvider({
  fortnightId,
  onReload,
  children,
}: {
  fortnightId: string
  onReload: () => void
  children: React.ReactNode
}) {
  const [rating, setRating] = useState<number | null>(null)
  const [globalComment, setGlobalComment] = useState('')
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({})
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [busySection, setBusySection] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/planner/feedback?fortnight_id=${fortnightId}`)
      .then((r) => (r.ok ? r.json() : { feedback: [] }))
      .then((d) => {
        const sections: Record<string, string> = {}
        for (const f of d.feedback ?? []) {
          if (f.section_key) sections[f.section_key] = f.comment ?? ''
          else {
            if (f.rating) setRating(f.rating)
            setGlobalComment(f.comment ?? '')
          }
        }
        setSectionComments(sections)
      })
      .catch(() => {})
  }, [fortnightId])

  async function post(body: Record<string, unknown>) {
    const res = await fetch('/api/planner/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fortnight_id: fortnightId, ...body }),
    })
    if (!res.ok) throw new Error('No se pudo guardar')
  }

  const value: FeedbackState = {
    fortnightId,
    rating,
    globalComment,
    sectionComments,
    openSection,
    busySection,
    setOpenSection,
    saveGlobal: async (r, c) => {
      setRating(r)
      setGlobalComment(c)
      await post({ rating: r, comment: c || undefined })
    },
    saveSection: async (key, c) => {
      await post({ section_key: key, comment: c })
      setSectionComments((p) => ({ ...p, [key]: c }))
      setOpenSection(null)
    },
    regenerateSection: async (key, c) => {
      setBusySection(key)
      try {
        const res = await fetch('/api/planner/regenerate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fortnight_id: fortnightId, section_key: key, comment: c }),
        })
        if (!res.ok) throw new Error((await res.json()).error ?? 'No se pudo regenerar')
        setSectionComments((p) => ({ ...p, [key]: c }))
        setOpenSection(null)
        onReload()
      } finally {
        setBusySection(null)
      }
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** DocSection's hook: null (render nothing) unless inside a provider AND a commentable key. */
export function useSectionFeedback(sectionKey?: string) {
  const ctx = useContext(Ctx)
  if (!ctx || !sectionKey || !COMMENTABLE.has(sectionKey)) return null
  return {
    comment: ctx.sectionComments[sectionKey] ?? null,
    open: ctx.openSection === sectionKey,
    busy: ctx.busySection === sectionKey,
    toggle: () => ctx.setOpenSection(ctx.openSection === sectionKey ? null : sectionKey),
  }
}

/** The inline Word-style comment box, rendered by DocSection when open. */
export function SectionCommentBox({ sectionKey }: { sectionKey: string }) {
  const ctx = useContext(Ctx)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    setText(ctx?.sectionComments[sectionKey] ?? '')
  }, [ctx?.sectionComments, sectionKey])
  if (!ctx) return null
  const busy = ctx.busySection === sectionKey || saving

  return (
    <div className="mb-3 rounded-lg border border-[color:var(--doc-border,#d1d5db)] bg-gray-50 p-3 print:hidden">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Comentario para esta sección (ej. 'muy larga', 'usa mis palabras de la semana')"
        className="w-full rounded-md border border-[color:var(--doc-border,#d1d5db)] bg-white px-2 py-1.5 text-[0.8125em] text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {error && <p className="mt-1 text-[0.75em] text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={async () => {
            setSaving(true)
            setError('')
            try {
              await ctx.saveSection(sectionKey, text.trim())
            } catch {
              setError('No se pudo guardar')
            } finally {
              setSaving(false)
            }
          }}
          className="flex cursor-pointer items-center gap-1 rounded-md border border-[color:var(--doc-border,#d1d5db)] px-3 py-1.5 text-[0.75em] font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check size={12} /> Comentar
        </button>
        <button
          type="button"
          disabled={busy || !text.trim()}
          onClick={async () => {
            setError('')
            try {
              await ctx.regenerateSection(sectionKey, text.trim())
            } catch (e) {
              setError(e instanceof Error ? e.message : 'No se pudo regenerar')
            }
          }}
          className="flex cursor-pointer items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[0.75em] font-medium text-white transition-colors duration-200 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ctx.busySection === sectionKey ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          Regenerar con este comentario
        </button>
      </div>
    </div>
  )
}

/** Global rating row — one discreet line after the last section. */
export function PlanFeedbackFooter() {
  const ctx = useContext(Ctx)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [saved, setSaved] = useState(false)
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    setComment(ctx?.globalComment ?? '')
  }, [ctx?.globalComment])
  if (!ctx) return null
  const current = ctx.rating ?? 0

  return (
    <div className="mt-8 border-t border-[color:var(--doc-border,#d1d5db)] pt-4 print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[0.8125em] text-gray-500">¿Qué tal esta planeación?</span>
        <div className="flex" role="radiogroup" aria-label="Calificación de la planeación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={current === n}
              aria-label={`${n} de 5 estrellas`}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={async () => {
                setExpanded(true)
                setSaved(false)
                try {
                  await ctx.saveGlobal(n, comment)
                  setSaved(true)
                } catch {
                  /* keep UI state; she can retry */
                }
              }}
              className="cursor-pointer p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Star
                size={20}
                className={
                  (hover || current) >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                }
              />
            </button>
          ))}
        </div>
        {saved && <span className="text-[0.75em] text-gray-400">Guardado</span>}
      </div>
      {expanded && (
        <div className="mt-2 flex max-w-xl gap-2">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            placeholder="¿Algo que mejorar para la próxima? (opcional)"
            className="flex-1 rounded-md border border-[color:var(--doc-border,#d1d5db)] bg-white px-2 py-1.5 text-[0.8125em] text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            disabled={!current}
            onClick={async () => {
              setSaved(false)
              try {
                await ctx.saveGlobal(current, comment)
                setSaved(true)
              } catch {
                /* retryable */
              }
            }}
            className="cursor-pointer rounded-md border border-[color:var(--doc-border,#d1d5db)] px-3 py-1.5 text-[0.75em] font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  )
}
