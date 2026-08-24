// /familia — everything a parent can see: their child(ren)'s homework status and the
// games/materials the teacher shared. Server-rendered. Authorization = claimed, unrevoked
// parent_links rows for auth.uid() (read via the user-scoped client under RLS); the child's
// data is then fetched via service role with explicit ids from those verified links
// (see lib/parents/child-data.ts).
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { grantsAccess } from '@/lib/parents/links'
import { getChildView, TYPE_LABELS, type ChildView } from '@/lib/parents/child-data'
import { getActiveAnnouncements, type SchoolAnnouncement } from '@/lib/school/announcements'
import { SchoolAnnouncements } from '@/components/school/SchoolAnnouncements'
import { LinkPlayerCard } from '@/components/parents/LinkPlayerCard'
import { GroupForum } from '@/components/forum/GroupForum'
import { SubmitTarea } from '@/components/parents/SubmitTarea'
import { AttachmentLink } from '@/components/files/AttachmentLink'

export const dynamic = 'force-dynamic'

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
    const child = await getChildView(service, link)
    if (child) children.push(child)
  }

  // School-wide announcements for the children's school(s), deduped when siblings share one.
  let schoolAnnouncements: SchoolAnnouncement[] = []
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: students } = await (service as any)
      .from('students')
      .select('id, groups(school_id)')
      .in(
        'id',
        links.map((l: { student_id: string }) => l.student_id)
      )
    const schoolIds = Array.from(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      new Set((students ?? []).map((s: any) => s.groups?.school_id).filter(Boolean))
    ) as string[]
    for (const sid of schoolIds) {
      schoolAnnouncements = schoolAnnouncements.concat(
        await getActiveAnnouncements(service, sid, 5)
      )
    }
  } catch {
    /* section simply doesn't show */
  }

  return (
    <div className="space-y-10">
      {schoolAnnouncements.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wide mb-3">
            Avisos de la escuela
          </h2>
          <SchoolAnnouncements items={schoolAnnouncements} />
        </section>
      )}
      {children.map((child, i) => (
        <section key={i}>
          <div className="flex items-center justify-between gap-3 mb-6">
            <h1 className="text-2xl font-semibold font-display text-text-primary">{child.name}</h1>
            <Link
              href={`/familia/${child.id}`}
              className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
            >
              Ver el espacio de {child.name}
            </Link>
          </div>

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
