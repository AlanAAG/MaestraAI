// /familia/[student] — the child's full space: their vocabulary, the teacher's games,
// announcements + attachments and homework. Same authorization as /familia: a claimed,
// unrevoked parent_links row for auth.uid() covering exactly this student; child data is
// then fetched via service role (lib/parents/child-data.ts).
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { grantsAccess } from '@/lib/parents/links'
import { getChildView, getChildVocab, TYPE_LABELS } from '@/lib/parents/child-data'
import { ChildVocab } from '@/components/parents/ChildVocab'
import { AttachmentLink } from '@/components/files/AttachmentLink'
import { SubmitTarea } from '@/components/parents/SubmitTarea'
import { LinkPlayerCard } from '@/components/parents/LinkPlayerCard'
import { appFontStyle } from '@/lib/design/fonts'
import { appThemeVars } from '@/lib/design/themes'
import { getActiveAnnouncements, type SchoolAnnouncement } from '@/lib/school/announcements'
import { SchoolAnnouncements } from '@/components/school/SchoolAnnouncements'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const GAME_EMOJI: Record<string, string> = {
  flashcards: '🃏',
  memory_game: '🧠',
  bingo: '🎱',
  word_search: '🔍',
  matching: '🧩',
  sorting_game: '🗂️',
  picture_word_match: '🖼️',
  youtube_videos: '🎬',
}

export default async function ChildSpacePage({ params }: { params: { student: string } }) {
  if (!UUID_RE.test(params.student)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null // middleware already redirects

  // The link is read under RLS — it proves this parent may see this student.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawLinks } = await (supabase as any)
    .from('parent_links')
    .select('id, student_id, teacher_id, expires_at, claimed_at, revoked_at')
    .eq('parent_auth_id', user.id)
    .eq('student_id', params.student)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const link = (rawLinks ?? []).find((l: any) => grantsAccess(l))
  if (!link) notFound()

  const service = createServiceClient()
  const child = await getChildView(service, link)
  if (!child) notFound()

  const today = new Date().toISOString().slice(0, 10)
  const vocab = await getChildVocab(service, child.groupId, child.groupTeacherId, today)

  // The child's space follows their teacher's look, like /jugar does (best-effort).
  let wrapperStyle: React.CSSProperties = {}
  if (child.groupTeacherId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (service as any)
      .from('teachers')
      .select('design_settings')
      .eq('id', child.groupTeacherId)
      .maybeSingle()
    const design = teacher?.design_settings
    wrapperStyle = {
      ...appFontStyle(design?.app_font),
      ...(appThemeVars(design?.app_color) ?? {}),
    } as React.CSSProperties
  }

  const tareas = child.posts.filter((p) => p.kind === 'tarea')
  const anuncios = child.posts.filter((p) => p.kind === 'anuncio')

  // School-wide announcements for the child's school (best-effort).
  let schoolAnnouncements: SchoolAnnouncement[] = []
  if (child.groupId) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: group } = await (service as any)
        .from('groups')
        .select('school_id')
        .eq('id', child.groupId)
        .maybeSingle()
      if (group?.school_id) {
        schoolAnnouncements = await getActiveAnnouncements(service, group.school_id, 5)
      }
    } catch {
      /* section simply doesn't show */
    }
  }

  return (
    <div style={wrapperStyle} className="space-y-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold font-display text-text-primary">
          El espacio de {child.name}
        </h1>
        <Link href="/familia" className="text-sm text-text-secondary underline shrink-0">
          Volver
        </Link>
      </div>

      <section>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
          Mi vocabulario
        </h2>
        <ChildVocab cards={vocab} />
      </section>

      <section>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
          Mis juegos
        </h2>
        {child.materiales.length === 0 ? (
          <p className="text-text-secondary text-sm">La maestra aún no ha compartido juegos.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {child.materiales.map((m) => (
              <Link
                key={m.id}
                href={`/jugar/${m.play_token}`}
                className="bg-surface border-2 border-border rounded-2xl p-5 text-center hover:border-brand transition-colors"
              >
                <span className="text-4xl">{GAME_EMOJI[m.type] ?? '🎲'}</span>
                <p className="mt-2 text-base font-semibold text-text-primary">
                  {m.title ?? TYPE_LABELS[m.type] ?? 'Juego'}
                </p>
                <p className="text-xs text-text-secondary">{TYPE_LABELS[m.type] ?? 'Juego'}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
          Mis tareas
        </h2>
        {tareas.length === 0 ? (
          <p className="text-text-secondary text-sm">No hay tareas pendientes. 🎉</p>
        ) : (
          <ul className="space-y-2">
            {tareas.map((p) => (
              <li key={p.id} className="bg-surface border border-border rounded-xl px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">📝 {p.title}</p>
                    {p.body && (
                      <p className="mt-1 whitespace-pre-line text-xs text-text-secondary">
                        {p.body}
                      </p>
                    )}
                    {p.due_date && (
                      <p className="mt-1 text-xs text-text-muted">
                        Entrega:{' '}
                        {new Date(`${p.due_date}T12:00:00`).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    )}
                    {p.play_token && (
                      <Link
                        href={`/jugar/${p.play_token}`}
                        className="mt-1 inline-block text-xs font-medium text-brand underline"
                      >
                        Jugar la actividad
                      </Link>
                    )}
                    {p.attachments.length > 0 && (
                      <span className="mt-1 flex flex-wrap gap-3">
                        {p.attachments.map((a, i) => (
                          <AttachmentLink key={i} path={a.path} name={a.name} />
                        ))}
                      </span>
                    )}
                    <span className="mt-2 block">
                      <SubmitTarea postId={p.id} studentId={child.id} />
                    </span>
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
      </section>

      {schoolAnnouncements.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
            Avisos de la escuela
          </h2>
          <SchoolAnnouncements items={schoolAnnouncements} />
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
          Avisos de la maestra
        </h2>
        {anuncios.length === 0 ? (
          <p className="text-text-secondary text-sm">No hay avisos por ahora.</p>
        ) : (
          <ul className="space-y-2">
            {anuncios.map((p) => (
              <li key={p.id} className="bg-surface border border-border rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-text-primary">📣 {p.title}</p>
                {p.body && (
                  <p className="mt-1 whitespace-pre-line text-xs text-text-secondary">{p.body}</p>
                )}
                <p className="mt-1 text-xs text-text-muted">
                  {new Date(p.created_at).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
                {p.attachments.length > 0 && (
                  <span className="mt-1 flex flex-wrap gap-3">
                    {p.attachments.map((a, i) => (
                      <AttachmentLink key={i} path={a.path} name={a.name} />
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!child.playerLinked && (
        <section>
          <LinkPlayerCard studentId={child.id} childName={child.name} />
        </section>
      )}
    </div>
  )
}
