'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, MessageCircle, Send, Trash2 } from 'lucide-react'

// Group forum: families post dudas, the teacher replies. One component for both roles —
// RLS decides what each session can read/write (teacher: all; parent: read group + post own).
type Question = {
  id: string
  author_auth: string
  author_name: string
  body: string
  reply_to: string | null
  created_at: string
}

export function GroupForum({
  groupId,
  groupTeacherId,
  authorName,
  isTeacher = false,
}: {
  groupId: string
  /** teachers.id of the group owner — required on insert (RLS anchors on it). */
  groupTeacherId: string
  authorName: string
  isTeacher?: boolean
}) {
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [myAuth, setMyAuth] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) setMyAuth(user.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('group_questions')
      .select('id, author_auth, author_name, body, reply_to, created_at')
      .eq('group_id', groupId)
      .order('created_at')
    setQuestions(data ?? [])
  }, [groupId])

  useEffect(() => {
    load()
  }, [load])

  async function send() {
    if (!body.trim()) return
    setSending(true)
    setError('')
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Inicia sesión de nuevo')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any).from('group_questions').insert({
        group_id: groupId,
        teacher_id: groupTeacherId,
        author_auth: user.id,
        author_name: authorName,
        body: body.trim(),
        reply_to: replyTo,
      })
      if (err) throw new Error('No se pudo enviar')
      setBody('')
      setReplyTo(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar')
    } finally {
      setSending(false)
    }
  }

  async function remove(id: string) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('group_questions').delete().eq('id', id)
    load()
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  const threads = (questions ?? []).filter((q) => !q.reply_to)
  const repliesOf = (id: string) => (questions ?? []).filter((q) => q.reply_to === id)

  return (
    <div>
      {questions === null ? (
        <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
      ) : threads.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Aún no hay dudas. {isTeacher ? '' : '¡Pregunta lo que necesites!'}
        </p>
      ) : (
        <ul className="space-y-3">
          {threads.map((q) => (
            <li key={q.id} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-text-primary">
                  <span className="font-medium">{q.author_name}</span>{' '}
                  <span className="text-xs text-text-muted">· {fmt(q.created_at)}</span>
                  <br />
                  <span className="whitespace-pre-line">{q.body}</span>
                </p>
                {(isTeacher || q.author_auth === myAuth) && (
                  <button
                    onClick={() => remove(q.id)}
                    className="cursor-pointer rounded p-1 text-text-disabled hover:bg-red-50 hover:text-red-600"
                    aria-label="Eliminar mensaje"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              {repliesOf(q.id).map((r) => (
                <div
                  key={r.id}
                  className="mt-2 ml-4 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <p className="text-sm text-text-primary">
                    <span className="font-medium">{r.author_name}</span>{' '}
                    <span className="text-xs text-text-muted">· {fmt(r.created_at)}</span>
                    <br />
                    <span className="whitespace-pre-line">{r.body}</span>
                  </p>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setReplyTo(replyTo === q.id ? null : q.id)}
                className="mt-2 cursor-pointer text-xs font-medium text-primary hover:underline"
              >
                {replyTo === q.id ? 'Cancelar respuesta' : 'Responder'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        {replyTo && (
          <p className="mb-1 text-xs text-text-secondary">
            Respondiendo a un mensaje — <MessageCircle size={11} className="inline" />
          </p>
        )}
        <div className="flex gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder={isTeacher ? 'Responder o publicar un aviso corto…' : 'Escribe tu duda…'}
            aria-label="Mensaje del foro"
            className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          />
          <button
            onClick={send}
            disabled={sending || !body.trim()}
            className="cursor-pointer self-end rounded-lg bg-primary px-4 py-2.5 text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Enviar mensaje"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    </div>
  )
}
