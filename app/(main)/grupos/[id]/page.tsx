'use client'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Loader2, Megaphone, ClipboardList, Trash2, Mail } from 'lucide-react'
import { GroupForum } from '@/components/forum/GroupForum'
import { AttachmentLink } from '@/components/files/AttachmentLink'

type MaterialOption = { id: string; label: string }
type Post = {
  id: string
  kind: 'anuncio' | 'tarea'
  title: string
  body: string | null
  due_date: string | null
  created_at: string
  attachments?: { name: string; path: string }[] | null
  materials?: { type: string; play_token: string | null; content?: { title?: string } } | null
  group_post_emails?: { sent: number; total: number }[]
}

const TYPE_LABELS: Record<string, string> = {
  flashcards: 'Flashcards',
  memory_game: 'Memorama',
  bingo: 'Bingo',
  word_search: 'Sopa de letras',
  matching: 'Relaciona',
  sorting_game: 'Ordena y clasifica',
  picture_word_match: '¿Cuál es la palabra?',
  letter_recognition: 'Reconoce la letra',
  worksheet: 'Hoja de trabajo',
  worksheets: 'Hoja de trabajo',
}

export default function GrupoWallPage() {
  const { id } = useParams<{ id: string }>()
  const [groupName, setGroupName] = useState('')
  const [forumCtx, setForumCtx] = useState<{ teacherId: string; name: string } | null>(null)
  const [posts, setPosts] = useState<Post[] | null>(null)
  const [materials, setMaterials] = useState<MaterialOption[]>([])
  // Composer
  const [kind, setKind] = useState<'anuncio' | 'tarea'>('anuncio')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [files, setFiles] = useState<{ name: string; path: string }[]>([])
  const [uploadingFile, setUploadingFile] = useState(false)
  const [subs, setSubs] = useState<
    Record<
      string,
      {
        id: string
        file_path: string
        file_name: string
        note: string | null
        student_name: string
      }[]
    >
  >({})

  async function attachFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || files.length >= 3) return
    if (file.size > 6 * 1024 * 1024) {
      setError('Archivo demasiado grande (máx 6MB).')
      return
    }
    setUploadingFile(true)
    setError('')
    try {
      const base64 = btoa(
        new Uint8Array(await file.arrayBuffer()).reduce((a, b) => a + String.fromCharCode(b), '')
      )
      const res = await fetch(`/api/groups/${id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mimeType: file.type, base64 }),
      })
      const data = await res.json().catch(() => ({}) as { error?: string })
      if (!res.ok) throw new Error(data.error ?? 'No se pudo subir')
      setFiles((p) => [...p, { name: data.name, path: data.path }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir')
    } finally {
      setUploadingFile(false)
    }
  }

  async function loadSubs(postId: string) {
    const res = await fetch(`/api/groups/${id}/submissions?post_id=${postId}`)
    if (res.ok) setSubs((p) => ({ ...p, [postId]: undefined as never }))
    const data = await res.json().catch(() => ({ submissions: [] }))
    setSubs((p) => ({ ...p, [postId]: data.submissions ?? [] }))
  }
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadPosts = useCallback(async () => {
    const res = await fetch(`/api/groups/${id}/posts`)
    if (res.ok) setPosts((await res.json()).posts)
    else setPosts([])
  }, [id])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: g } = await (supabase as any)
        .from('groups')
        .select('name, titular_teacher_id')
        .eq('id', id)
        .single()
      if (g) setGroupName(g.name)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: me } = await (supabase as any)
        .from('teachers')
        .select('id, full_name')
        .limit(1)
        .single()
      if (g && me) setForumCtx({ teacherId: g.titular_teacher_id, name: me.full_name ?? 'Maestra' })
      // Teacher's materials for the tarea picker (RLS scopes to hers).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: mats } = await (supabase as any)
        .from('materials')
        .select('id, type, content')
        .order('generated_at', { ascending: false })
        .limit(60)
      setMaterials(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mats ?? []).map((m: any) => ({
          id: m.id,
          label: `${TYPE_LABELS[m.type] ?? m.type}${m.content?.title ? ` — ${m.content.title}` : ''}`,
        }))
      )
      loadPosts()
    }
    load()
  }, [id, loadPosts])

  async function publish() {
    setPublishing(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`/api/groups/${id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          title: title.trim(),
          body: body.trim() || undefined,
          material_id: kind === 'tarea' ? materialId || undefined : undefined,
          due_date: kind === 'tarea' && dueDate ? dueDate : undefined,
          attachments: files.length ? files : undefined,
        }),
      })
      const data = await res.json().catch(() => ({}) as { error?: string })
      if (!res.ok) throw new Error(data.error ?? 'No se pudo publicar')
      setNotice(
        data.total > 0
          ? `Publicado y enviado a ${data.sent} de ${data.total} familias`
          : 'Publicado (sin correos de familias registrados aún)'
      )
      setTitle('')
      setBody('')
      setMaterialId('')
      setDueDate('')
      setFiles([])
      loadPosts()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo publicar')
    } finally {
      setPublishing(false)
    }
  }

  async function remove(postId: string) {
    await fetch(`/api/groups/${id}/posts?post_id=${postId}`, { method: 'DELETE' }).catch(() => {})
    loadPosts()
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/grupos"
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft size={15} /> Mis grupos
      </Link>
      <h1 className="text-2xl font-semibold font-display text-text-primary mb-6">{groupName}</h1>

      {/* Composer */}
      <Card className="p-5 border-2 mb-8">
        <div className="mb-3 flex gap-2">
          {(
            [
              ['anuncio', 'Anuncio', Megaphone],
              ['tarea', 'Tarea', ClipboardList],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-colors ${
                kind === k
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-text-secondary hover:border-border-strong'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={kind === 'tarea' ? 'Título de la tarea' : 'Título del anuncio'}
          maxLength={200}
          className="mb-2 min-h-[44px]"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={5000}
          placeholder="Mensaje para las familias (opcional)"
          aria-label="Mensaje para las familias"
          className="mb-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        />
        {kind === 'tarea' && (
          <div className="mb-2 grid gap-2 sm:grid-cols-2">
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              aria-label="Material asignado"
              className="min-h-[44px] rounded-lg border border-border bg-surface px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Elige el material a resolver…</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <div>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Fecha límite"
                className="min-h-[44px]"
              />
              <p className="mt-1 text-xs text-text-muted">Fecha límite (opcional)</p>
            </div>
          </div>
        )}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {files.map((f, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-primary"
            >
              📎 {f.name}
              <button
                type="button"
                onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}
                className="cursor-pointer text-text-disabled hover:text-red-600"
                aria-label={`Quitar ${f.name}`}
              >
                ×
              </button>
            </span>
          ))}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-primary">
            {uploadingFile ? <Loader2 size={13} className="animate-spin" /> : '📎'} Adjuntar archivo
            <input
              type="file"
              accept=".pdf,.docx,image/jpeg,image/png,image/webp"
              onChange={attachFile}
              disabled={uploadingFile || files.length >= 3}
              className="hidden"
              aria-label="Adjuntar archivo a la publicación"
            />
          </label>
        </div>
        {error && <p className="mb-2 text-sm text-error">{error}</p>}
        {notice && (
          <p className="mb-2 flex items-center gap-1.5 text-sm text-success-text">
            <Mail size={14} /> {notice}
          </p>
        )}
        <Button
          onClick={publish}
          disabled={publishing || !title.trim() || (kind === 'tarea' && !materialId)}
        >
          {publishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publicando…
            </>
          ) : (
            'Publicar y avisar a las familias'
          )}
        </Button>
      </Card>

      {/* Feed */}
      {posts === null ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-text-secondary">
          Aún no hay publicaciones en este grupo.
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => {
            const emails = p.group_post_emails?.[0]
            return (
              <Card key={p.id} className="p-5 border-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.kind === 'tarea'
                          ? 'bg-warning-light text-warning-text'
                          : 'bg-success-light text-success-text'
                      }`}
                    >
                      {p.kind === 'tarea' ? <ClipboardList size={12} /> : <Megaphone size={12} />}
                      {p.kind === 'tarea' ? 'Tarea' : 'Anuncio'}
                    </span>
                    <h2 className="mt-2 text-base font-semibold text-text-primary">{p.title}</h2>
                    {p.body && (
                      <p className="mt-1 whitespace-pre-line text-sm text-text-secondary">
                        {p.body}
                      </p>
                    )}
                    {p.materials?.play_token && (
                      <Link
                        href={`/jugar/${p.materials.play_token}`}
                        className="mt-2 inline-block text-sm text-primary underline"
                      >
                        {TYPE_LABELS[p.materials.type] ?? 'Material'}
                        {p.materials.content?.title ? ` — ${p.materials.content.title}` : ''}
                      </Link>
                    )}
                    {(p.attachments ?? []).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-3">
                        {(p.attachments ?? []).map((a, i) => (
                          <AttachmentLink key={i} path={a.path} name={a.name} />
                        ))}
                      </div>
                    )}
                    {p.kind === 'tarea' && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() =>
                            subs[p.id]
                              ? setSubs((x) => ({ ...x, [p.id]: undefined as never }))
                              : loadSubs(p.id)
                          }
                          className="cursor-pointer text-xs font-medium text-primary hover:underline"
                        >
                          {subs[p.id] ? 'Ocultar entregas' : 'Ver entregas'}
                        </button>
                        {subs[p.id] && (
                          <ul className="mt-2 space-y-1.5">
                            {subs[p.id].length === 0 ? (
                              <li className="text-xs text-text-secondary">Aún no hay entregas.</li>
                            ) : (
                              subs[p.id].map((sub) => (
                                <li
                                  key={sub.id}
                                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs"
                                >
                                  <span className="font-medium text-text-primary">
                                    {sub.student_name}
                                  </span>
                                  <AttachmentLink path={sub.file_path} name={sub.file_name} />
                                  {sub.note && (
                                    <span className="text-text-secondary">“{sub.note}”</span>
                                  )}
                                </li>
                              ))
                            )}
                          </ul>
                        )}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-text-muted">
                      {fmt(p.created_at)}
                      {p.due_date ? ` · entrega: ${fmt(p.due_date)}` : ''}
                      {emails ? ` · correo a ${emails.sent}/${emails.total} familias` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(p.id)}
                    className="cursor-pointer rounded-md p-1.5 text-text-disabled transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Eliminar publicación"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {/* Dudas de las familias */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Dudas de las familias
        </h2>
        {forumCtx && (
          <GroupForum
            groupId={id}
            groupTeacherId={forumCtx.teacherId}
            authorName={`Miss ${forumCtx.name.split(' ')[0]}`}
            isTeacher
          />
        )}
      </section>
    </div>
  )
}
