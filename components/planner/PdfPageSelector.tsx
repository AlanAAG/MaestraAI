'use client'
// iLovePDF-style page picker: thumbnails of every page with a toggle. ALL pages always feed the
// AI as context; only the toggled-ON pages get annexed into the planeación document.
// pdfjs renders thumbnails from the local File — nothing is uploaded until the teacher confirms.
import { useEffect, useState } from 'react'
import { Loader2, Check } from 'lucide-react'

type Thumb = { page: number; url: string }

export function PdfPageSelector({
  file,
  onConfirm,
  onCancel,
}: {
  file: File
  /** pages = 1-based page numbers to annex; [] = context only, nothing annexed. */
  onConfirm: (pages: number[]) => void
  onCancel: () => void
}) {
  const [thumbs, setThumbs] = useState<Thumb[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function render() {
      try {
        const pdfjs = await import('pdfjs-dist')
        // Served from /public — bundling the .mjs worker through webpack/Terser breaks the
        // build (import.meta in non-module output). Copied from pdfjs-dist at install time;
        // re-copy if pdfjs-dist is ever upgraded.
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
        const count = Math.min(doc.numPages, 40) // thumbnail cap — context still uses ALL pages
        const out: Thumb[] = []
        for (let i = 1; i <= count; i++) {
          const page = await doc.getPage(i)
          const viewport = page.getViewport({ scale: 0.35 })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')!
          await page.render({ canvas, canvasContext: ctx, viewport }).promise
          out.push({ page: i, url: canvas.toDataURL('image/jpeg', 0.7) })
          if (cancelled) return
        }
        if (!cancelled) {
          setThumbs(out)
          // Default: every page annexed — unticking is the deliberate act.
          setSelected(new Set(out.map((t) => t.page)))
        }
      } catch (e) {
        console.error('[pdf-selector]', e)
        if (!cancelled) setError('No pude previsualizar el PDF. Se anexará completo.')
      }
    }
    render()
    return () => {
      cancelled = true
    }
  }, [file])

  function toggle(p: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-card p-5 shadow-2xl">
        <h2 className="text-sm font-semibold text-text-primary">
          ¿Qué páginas se anexan a la planeación?
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          La IA leerá TODAS las páginas como contexto. Aquí eliges cuáles quedan adjuntas en el
          documento final (ej. solo la hoja de trabajo). Desmarca las que no.
        </p>
        {error && <p className="mt-2 text-xs text-error">{error}</p>}
        <div className="mt-4 flex-1 overflow-y-auto">
          {thumbs === null ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" /> Generando vistas previas…
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {thumbs.map((t) => {
                const on = selected.has(t.page)
                return (
                  <button
                    key={t.page}
                    type="button"
                    onClick={() => toggle(t.page)}
                    aria-pressed={on}
                    aria-label={`Página ${t.page} ${on ? 'anexada' : 'solo contexto'}`}
                    className={`relative cursor-pointer overflow-hidden rounded-lg border-2 transition-colors ${
                      on ? 'border-primary' : 'border-border opacity-55'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.url} alt={`Página ${t.page}`} className="w-full" />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px] font-medium text-white">
                      {t.page}
                    </span>
                    {on && (
                      <span className="absolute right-1 top-1 rounded-full bg-primary p-0.5 text-white">
                        <Check size={11} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onConfirm([])}
            className="cursor-pointer text-xs font-medium text-text-secondary underline"
          >
            Solo contexto — no anexar ninguna página
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-inset"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onConfirm(Array.from(selected).sort((a, b) => a - b))}
              disabled={thumbs === null && !error}
              className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              Anexar {selected.size} página{selected.size === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
