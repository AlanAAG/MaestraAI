// /red/supervision — read-only oversight for the director: what every teacher of the school
// has produced (planeaciones, materiales/juegos, anuncios). All queries run USER-SCOPED so
// the RLS SELECT policies of migration 082 are the actual authorization — nothing here can
// write, and a non-admin sees only their own rows (and is redirected anyway).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { summarizeByTeacher } from '@/lib/school/oversight'
import { TYPE_LABELS } from '@/lib/parents/child-data'

export const dynamic = 'force-dynamic'

export default async function SupervisionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: me } = await (supabase as any)
    .from('teachers')
    .select('id, role_type, school_id')
    .eq('auth_id', user.id)
    .single()
  if (me?.role_type !== 'admin' || !me?.school_id) redirect('/red')

  // Staff names via service role (teachers RLS is self-only); admin role verified above.
  // Content queries stay USER-SCOPED so migration 082's SELECT policies are the authorization.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any
  const [{ data: staff }, { data: planes }, { data: materiales }, { data: posts }] =
    await Promise.all([
      service
        .from('teachers')
        .select('id, full_name, role_type')
        .eq('school_id', me.school_id)
        .order('full_name'),
      sb
        .from('fortnights')
        .select('id, teacher_id, plan_type, project_name, start_date, end_date, status')
        .order('start_date', { ascending: false })
        .limit(200),
      sb
        .from('materials')
        .select('id, teacher_id, type, content->>title, generated_at')
        .order('generated_at', { ascending: false })
        .limit(200),
      sb
        .from('group_posts')
        .select('id, teacher_id, kind, title, created_at')
        .order('created_at', { ascending: false })
        .limit(100),
    ])

  const summaries = summarizeByTeacher(planes ?? [], materiales ?? [], posts ?? [])
  const byTeacher = new Map(summaries.map((s) => [s.teacherId, s]))
  const fmt = (d: string | null) =>
    d
      ? new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
      : ''

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold font-display text-text-primary">Supervisión</h1>
        <Link href="/red" className="text-sm text-text-secondary underline">
          Volver a la red
        </Link>
      </div>
      <p className="text-sm text-text-secondary mb-8">
        Vista de solo lectura del trabajo de cada maestra de tu escuela.
      </p>

      <div className="space-y-6">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {(staff ?? []).map((t: any) => {
          const s = byTeacher.get(t.id)
          return (
            <section key={t.id} className="rounded-xl border-2 border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-text-primary">{t.full_name}</h2>
                <span className="text-xs text-text-secondary">
                  {t.role_type === 'admin'
                    ? 'Dirección'
                    : t.role_type === 'coordinator'
                      ? 'Coordinación'
                      : 'Docente'}
                </span>
              </div>

              <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-1">
                Planeaciones ({s?.planes.length ?? 0})
              </h3>
              {s?.planes.length ? (
                <ul className="mb-3 space-y-1">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {s.planes.slice(0, 6).map((p: any) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-text-primary truncate">
                        {p.project_name ?? p.plan_type}
                      </span>
                      <span className="shrink-0 text-xs text-text-secondary">
                        {fmt(p.start_date)} – {fmt(p.end_date)}
                        {p.status ? ` · ${p.status}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-3 text-sm text-text-secondary">Sin planeaciones.</p>
              )}

              <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-1">
                Materiales y juegos ({s?.materiales.length ?? 0})
              </h3>
              {s?.materiales.length ? (
                <ul className="mb-3 space-y-1">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {s.materiales.slice(0, 6).map((m: any) => (
                    <li key={m.id} className="flex items-center justify-between text-sm">
                      <span className="text-text-primary truncate">
                        {m.title ?? TYPE_LABELS[m.type] ?? m.type}
                      </span>
                      <span className="shrink-0 text-xs text-text-secondary">
                        {TYPE_LABELS[m.type] ?? m.type}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-3 text-sm text-text-secondary">Sin materiales.</p>
              )}

              <h3 className="text-xs font-medium uppercase tracking-wide text-text-secondary mb-1">
                Anuncios del grupo ({s?.posts.length ?? 0})
              </h3>
              {s?.posts.length ? (
                <ul className="space-y-1">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {s.posts.slice(0, 4).map((g: any) => (
                    <li key={g.id} className="text-sm text-text-primary truncate">
                      {g.kind === 'tarea' ? '📝' : '📣'} {g.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-secondary">Sin anuncios.</p>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
