// /familia — everything a parent can see: their child(ren)'s homework status and the
// games/materials the teacher shared. Server-rendered. Authorization = claimed, unrevoked
// parent_links rows for auth.uid() (read via the user-scoped client under RLS); the child's
// data is then fetched via service role with explicit ids from those verified links.
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { decryptName } from '@/lib/students/name'
import { grantsAccess } from '@/lib/parents/links'
import { tareaEntregada, type PlayRow } from '@/lib/groups/classroom'
import { LinkPlayerCard } from '@/components/parents/LinkPlayerCard'
import { GroupForum } from '@/components/forum/GroupForum'
import { SubmitTarea } from '@/components/parents/SubmitTarea'
import { AttachmentLink } from '@/components/files/AttachmentLink'

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

interface Juego {
  title: string
  correct: number
  total: number
  passed: boolean | null
  at: string
}

interface Post {
  id: string
  kind: 'anuncio' | 'tarea'
  attachments: { name: string; path: string }[]
  title: string
  body: string | null
  due_date: string | null
  created_at: string
  material_type: string | null
  material_title: string | null
  play_token: string | null
  entregada: boolean | null // null = anuncio (no delivery state)
}

interface ChildView {
  id: string
  groupId: string | null
  groupTeacherId: string | null
  name: string
  tareas: Tarea[]
  materiales: Material[]
  /** null = the teacher turned game results off, or no profile is linked yet. */
  juegos: Juego[] | null
  playerLinked: boolean
  posts: Post[]
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
      .select('id, group_id, first_name_encrypted, last_name_encrypted, groups(titular_teacher_id)')
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

    // Game results (migration 069). Visible only if the teacher allows it AND the child's play
    // profile was linked with its code. Best-effort: any error → the section simply doesn't show.
    let juegos: Juego[] | null = null
    let playerLinked = false
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher } = await (service as any)
        .from('teachers')
        .select('share_game_scores')
        .eq('id', link.teacher_id)
        .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: players } = await (service as any)
        .from('game_players')
        .select('id')
        .eq('student_id', link.student_id)
      playerLinked = !!players?.length
      if (teacher?.share_game_scores !== false && playerLinked) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: plays } = await (service as any)
          .from('game_plays')
          .select('correct, total, passed, created_at, materials(type, content)')
          .in(
            'player_id',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (players ?? []).map((p: any) => p.id)
          )
          .order('created_at', { ascending: false })
          .limit(20)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        juegos = (plays ?? []).map((p: any) => ({
          title: p.materials?.content?.title ?? TYPE_LABELS[p.materials?.type] ?? 'Juego',
          correct: p.correct,
          total: p.total,
          passed: p.passed,
          at: p.created_at,
        }))
      }
    } catch {
      // migration 069 not applied yet → no games section
    }

    // Group wall: anuncios + tareas for the child's group. Tarea delivery state comes from the
    // child's linked play profiles (best-effort — everything degrades to just the feed).
    let posts: Post[] = []
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rawPosts } = await (service as any)
        .from('group_posts')
        .select(
          'id, kind, title, body, material_id, due_date, created_at, materials(type, play_token, content)'
        )
        .eq('group_id', student.group_id)
        .order('created_at', { ascending: false })
        .limit(20)
      let plays: PlayRow[] = []
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: players } = await (service as any)
          .from('game_players')
          .select('id')
          .eq('student_id', link.student_id)
        if (players?.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: playRows } = await (service as any)
            .from('game_plays')
            .select('material_id, passed')
            .in(
              'player_id',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              players.map((p: any) => p.id)
            )
          plays = (playRows ?? []) as PlayRow[]
        }
      } catch {
        /* migration 069 absent → no delivery state */
      }
      // Homework files this family already uploaded (a submission also counts as entregada).
      let submittedPosts = new Set<string>()
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: mySubs } = await (service as any)
          .from('task_submissions')
          .select('post_id')
          .eq('student_id', link.student_id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        submittedPosts = new Set((mySubs ?? []).map((x: any) => x.post_id))
      } catch {
        /* migration 078 absent */
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      posts = (rawPosts ?? []).map((p: any) => ({
        id: p.id,
        kind: p.kind,
        title: p.title,
        body: p.body,
        due_date: p.due_date,
        created_at: p.created_at,
        material_type: p.materials?.type ?? null,
        material_title: p.materials?.content?.title ?? null,
        play_token: p.materials?.play_token ?? null,
        attachments: Array.isArray(p.attachments) ? p.attachments : [],
        entregada:
          p.kind === 'tarea'
            ? tareaEntregada(p.material_id, plays) || submittedPosts.has(p.id)
            : null,
      }))
    } catch {
      /* migration 074 absent → no wall */
    }

    children.push({
      id: link.student_id,
      groupId: student.group_id ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      groupTeacherId: (student as any).groups?.titular_teacher_id ?? null,
      name: first || 'Tu hijo/a',
      tareas,
      materiales: (materials ?? []) as Material[],
      juegos,
      playerLinked,
      posts,
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
            Anuncios y tareas del grupo
          </h2>
          {child.posts.length === 0 ? (
            <p className="text-text-secondary text-sm mb-8">Aún no hay anuncios de la maestra.</p>
          ) : (
            <ul className="space-y-2 mb-8">
              {child.posts.map((p) => (
                <li key={p.id} className="bg-surface border border-border rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {p.kind === 'tarea' ? '📝 ' : '📣 '}
                        {p.title}
                      </p>
                      {p.body && (
                        <p className="mt-1 whitespace-pre-line text-xs text-text-secondary">
                          {p.body}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-text-muted">
                        {new Date(p.created_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'long',
                        })}
                        {p.due_date
                          ? ` · entrega: ${new Date(`${p.due_date}T12:00:00`).toLocaleDateString(
                              'es-MX',
                              { day: 'numeric', month: 'long' }
                            )}`
                          : ''}
                      </p>
                      {p.play_token && (
                        <Link
                          href={`/jugar/${p.play_token}`}
                          className="mt-1 inline-block text-xs font-medium text-brand underline"
                        >
                          Abrir la actividad
                        </Link>
                      )}
                      {p.attachments.length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-3">
                          {p.attachments.map((a, i) => (
                            <AttachmentLink key={i} path={a.path} name={a.name} />
                          ))}
                        </span>
                      )}
                      {p.kind === 'tarea' && (
                        <span className="mt-2 block">
                          <SubmitTarea postId={p.id} studentId={child.id} />
                        </span>
                      )}
                    </div>
                    {p.entregada !== null && (
                      <span
                        className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full ${
                          p.entregada
                            ? 'bg-success-light text-success-text'
                            : 'bg-warning-light text-warning-text'
                        }`}
                      >
                        {p.entregada ? 'Entregado' : 'Pendiente'}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
            Dudas al profesor
          </h2>
          <div className="mb-8">
            {child.groupId && child.groupTeacherId ? (
              <GroupForum
                groupId={child.groupId}
                groupTeacherId={child.groupTeacherId}
                authorName={`Familia de ${child.name}`}
              />
            ) : (
              <p className="text-sm text-text-secondary">
                El foro del grupo aún no está disponible.
              </p>
            )}
          </div>

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
            Sus aciertos en los juegos
          </h2>
          {!child.playerLinked ? (
            <div className="mb-8">
              <LinkPlayerCard studentId={child.id} childName={child.name} />
            </div>
          ) : child.juegos === null ? (
            <p className="text-text-secondary text-sm mb-8">
              La maestra no está compartiendo los resultados de los juegos.
            </p>
          ) : child.juegos.length === 0 ? (
            <p className="text-text-secondary text-sm mb-8">
              Aún no hay partidas registradas. ¡A jugar!
            </p>
          ) : (
            <ul className="space-y-2 mb-8">
              {child.juegos.map((j, k) => (
                <li
                  key={k}
                  className="flex items-center justify-between bg-surface border border-border rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{j.title}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(j.at).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-3 py-1 rounded-full ${
                      j.passed === false
                        ? 'bg-warning-light text-warning-text'
                        : 'bg-success-light text-success-text'
                    }`}
                  >
                    {j.correct} de {j.total} aciertos
                    {j.passed === false ? ' · falta repetir' : ''}
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
