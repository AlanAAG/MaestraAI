// /familia — everything a parent can see: their child(ren)'s homework status and the
// games/materials the teacher shared. Server-rendered. Authorization = claimed, unrevoked
// parent_links rows for auth.uid() (read via the user-scoped client under RLS); the child's
// data is then fetched via service role with explicit ids from those verified links.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { decryptName } from '@/lib/students/name'
import { grantsAccess } from '@/lib/parents/links'

export const dynamic = 'force-dynamic'

interface Tarea {
  title: string
  due_at: string | null
  done: boolean
}

interface Material {
  id: string
  title: string | null
  type: string
  play_token: string
}

interface ChildView {
  name: string
  tareas: Tarea[]
  materiales: Material[]
}

const TYPE_LABELS: Record<string, string> = {
  flashcards: 'Tarjetas',
  memory_game: 'Memorama',
  bingo: 'Bingo',
  word_search: 'Sopa de letras',
  matching: 'Relacionar',
  sorting_game: 'Clasificar',
  picture_word_match: '¿Cuál es la palabra?',
  youtube_videos: 'Videos',
}

export default async function FamiliaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null // middleware already redirects; belt-and-suspenders

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawLinks } = await (supabase as any)
    .from('parent_links')
    .select('id, student_id, teacher_id, expires_at, claimed_at, revoked_at')
    .eq('parent_auth_id', user.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const links = (rawLinks ?? []).filter((l: any) => grantsAccess(l))

  if (!links.length) {
    return (
      <div className="text-center py-16">
        <h1 className="text-xl font-semibold text-text-primary mb-3">Sin acceso activo</h1>
        <p className="text-text-secondary">
          Tu invitación está pendiente o fue desactivada. Pide a la maestra de tu hijo/a que te
          envíe una nueva invitación.
        </p>
      </div>
    )
  }

  const service = createServiceClient()
  const children: ChildView[] = []

  for (const link of links) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: student } = await (service as any)
      .from('students')
      .select('id, first_name_encrypted, last_name_encrypted')
      .eq('id', link.student_id)
      .single()
    if (!student) continue

    const { first } = await decryptName(student).catch(() => ({ first: 'Tu hijo/a' }))

    // Homework: done/pending only — never numeric scores (NEM: qualitative always).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scores } = await (service as any)
      .from('richmond_scores')
      .select('done, richmond_assignments(title, due_at)')
      .eq('student_id', link.student_id)
      .order('synced_at', { ascending: false })
      .limit(30)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tareas: Tarea[] = (scores ?? []).map((s: any) => ({
      title: s.richmond_assignments?.title ?? 'Tarea',
      due_at: s.richmond_assignments?.due_at ?? null,
      done: !!s.done,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: materials } = await (service as any)
      .from('materials')
      .select('id, title:content->>title, type, play_token')
      .eq('teacher_id', link.teacher_id)
      .eq('shared_with_parents', true)
      .not('play_token', 'is', null)
      .order('generated_at', { ascending: false })
      .limit(24)

    children.push({
      name: first || 'Tu hijo/a',
      tareas,
      materiales: (materials ?? []) as Material[],
    })
  }

  return (
    <div className="space-y-10">
      {children.map((child, i) => (
        <section key={i}>
          <h1 className="text-2xl font-semibold font-display text-text-primary mb-6">
            {child.name}
          </h1>

          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
            Tareas
          </h2>
          {child.tareas.length === 0 ? (
            <p className="text-text-secondary text-sm mb-8">Aún no hay tareas registradas.</p>
          ) : (
            <ul className="space-y-2 mb-8">
              {child.tareas.map((t, j) => (
                <li
                  key={j}
                  className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{t.title}</p>
                    {t.due_at && (
                      <p className="text-xs text-text-secondary">
                        {new Date(t.due_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${
                      t.done
                        ? 'bg-success-light text-success-text'
                        : 'bg-warning-light text-warning-text'
                    }`}
                  >
                    {t.done ? 'Entregado' : 'Pendiente'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
            Juegos y materiales
          </h2>
          {child.materiales.length === 0 ? (
            <p className="text-text-secondary text-sm">
              La maestra aún no ha compartido materiales.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {child.materiales.map((m) => (
                <Link
                  key={m.id}
                  href={`/jugar/${m.play_token}`}
                  className="bg-surface border border-border rounded-xl p-4 hover:border-brand transition-colors"
                >
                  <p className="text-xs text-text-secondary mb-1">
                    {TYPE_LABELS[m.type] ?? 'Material'}
                  </p>
                  <p className="text-sm font-medium text-text-primary">
                    {m.title ?? TYPE_LABELS[m.type] ?? 'Material'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
