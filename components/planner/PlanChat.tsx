'use client'

/**
 * Conversational editing of a generated planeación.
 *
 * The draft stays server-authoritative — exactly like inline edits and
 * regenerate-section. When a turn reports edited sections we call onReload()
 * and let the viewer re-render from the refetched plan_document, rather than
 * patching anything client-side.
 */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, ChevronDown, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  edited_sections?: string[] | null
  /** True while this turn's change is still the newest and can be rolled back. */
  can_undo?: boolean
}

// One per thing the chat is for: revisar, mejorar, agregar, ideas.
const SUGGESTIONS = [
  '¿Ves algo que no cuadre en la planeación?',
  'Hazlo más corto y directo',
  'Agrega más actividades de movimiento',
  'Dame ideas para cerrar el proyecto',
]

export function PlanChat({
  fortnightId,
  onReload,
}: {
  fortnightId: string
  onReload: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [edited, setEdited] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // History loads once, the first time the panel is opened.
  useEffect(() => {
    if (!open || loaded) return
    setLoaded(true)
    fetch(`/api/planner/chat?fortnight_id=${fortnightId}`)
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d) => setMessages(d.messages ?? []))
      .catch(() => {})
  }, [open, loaded, fortnightId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streaming])

  async function undo(messageId: string) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/planner/chat/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fortnight_id: fortnightId, message_id: messageId }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error ?? 'No pude deshacer el cambio.')
      await onReload()
      const r = await fetch(`/api/planner/chat?fortnight_id=${fortnightId}`)
      if (r.ok) setMessages((await r.json()).messages ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude deshacer el cambio.')
    } finally {
      setBusy(false)
    }
  }

  async function send(text: string) {
    const message = text.trim()
    if (!message || busy) return

    setInput('')
    setError('')
    setEdited([])
    setBusy(true)
    setMessages((m) => [...m, { id: `local-${m.length}`, role: 'user', content: message }])

    let reply = ''
    const touched: string[] = []

    try {
      const res = await fetch('/api/planner/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fortnight_id: fortnightId, message }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'No pude responder.')
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') continue
          const ev = JSON.parse(raw)
          if (ev.error) throw new Error(ev.error)
          if (ev.delta) {
            reply += ev.delta
            setStreaming(reply)
          }
          if (ev.edited) {
            touched.push(ev.label ?? ev.edited)
            setEdited([...touched])
          }
        }
      }

      if (touched.length) await onReload()
      // Refetch so the new turn carries its real id — undo needs it, and the
      // optimistic local id would 400 the endpoint.
      if (touched.length) {
        const r = await fetch(`/api/planner/chat?fortnight_id=${fortnightId}`)
        if (r.ok) {
          setMessages((await r.json()).messages ?? [])
          return
        }
      }
      setMessages((m) => [
        ...m,
        {
          id: `local-a-${m.length}`,
          role: 'assistant',
          content: reply.trim() || 'Listo.',
          edited_sections: touched,
        },
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal.')
    } finally {
      setStreaming('')
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-5 py-4 text-left hover:bg-muted/50 transition-colors cursor-pointer min-h-[44px]"
      >
        <Sparkles size={18} className="text-primary flex-shrink-0" />
        <span className="font-medium text-text-primary text-sm">
          Seguir editando con la asistente
        </span>
        <span className="text-xs text-text-secondary hidden sm:inline">
          — pídele cambios en tus palabras
        </span>
        <ChevronDown
          size={16}
          className={`ml-auto text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border"
          >
            <div ref={scrollRef} className="max-h-[420px] overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 && !streaming && (
                <div className="py-2">
                  <p className="text-sm text-text-secondary mb-3">
                    Corrige errores, agrega o quita cosas, pide ideas. Los cambios se aplican al
                    documento y puedes deshacerlos.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        disabled={busy}
                        className="text-xs px-3 py-1.5 rounded-full border border-border text-text-secondary hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-primary text-white rounded-br-sm'
                        : 'bg-muted text-text-primary rounded-bl-sm'
                    }`}
                  >
                    {m.content}
                    {!!m.edited_sections?.length && (
                      <div className="mt-2 pt-2 border-t border-border/40 text-xs flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="opacity-80">
                          Actualicé: <strong>{m.edited_sections.join(', ')}</strong>
                        </span>
                        {m.can_undo && (
                          <button
                            onClick={() => undo(m.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1 underline underline-offset-2 hover:no-underline cursor-pointer disabled:opacity-50"
                          >
                            <Undo2 size={12} />
                            Deshacer
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {streaming && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-muted text-text-primary whitespace-pre-wrap">
                    {streaming}
                  </div>
                </div>
              )}

              {busy && !streaming && (
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse [animation-delay:300ms]" />
                  </span>
                  {edited.length ? `Actualizando ${edited.join(', ')}…` : 'Pensando…'}
                </div>
              )}

              {error && <p className="text-sm text-error-text">{error}</p>}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
              className="flex items-end gap-2 border-t border-border px-4 py-3"
            >
              <label htmlFor="plan-chat-input" className="sr-only">
                Mensaje para la asistente
              </label>
              <textarea
                id="plan-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send(input)
                  }
                }}
                rows={1}
                maxLength={2000}
                disabled={busy}
                placeholder="Ej. cambia el proyecto por uno sobre animales"
                className="flex-1 resize-none bg-transparent text-sm text-text-primary placeholder:text-text-disabled focus:outline-none py-2.5 max-h-32 disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={busy || !input.trim()}
                className="min-h-[44px] min-w-[44px] px-3 bg-primary hover:bg-primary-dark disabled:opacity-40"
                aria-label="Enviar mensaje"
              >
                <Send size={16} />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
