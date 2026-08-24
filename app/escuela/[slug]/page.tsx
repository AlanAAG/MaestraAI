// School portal — maestraia.com/escuela/<slug>. Auth required (middleware redirects to login);
// content only for members: teachers of the school, or parents with a claimed link to a student
// in one of its groups. Everyone else sees "acceso restringido".
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { grantsAccess } from '@/lib/parents/links'
import { getActiveAnnouncements } from '@/lib/school/announcements'
import { SchoolAnnouncements } from '@/components/school/SchoolAnnouncements'

export const dynamic = 'force-dynamic'

export default async function EscuelaPage({ params }: { params: { slug: string } }) {
  const slug = params.slug.toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(slug)) return <Denied />

  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: school } = await (service as any)
    .from('schools')
    .select('id, name, city, logo_url, brand_color')
    .eq('slug', slug)
    .maybeSingle()
  if (!school) return <Denied />

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return <Denied />

  // Membership: teacher of this school…
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (service as any)
    .from('teachers')
    .select('id, full_name, role_type, school_id')
    .eq('auth_id', user.id)
    .maybeSingle()
  const isTeacher = teacher?.school_id === school.id

  // …or parent linked to a student in one of its groups.
  let isParent = false
  if (!isTeacher) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: links } = await (service as any)
      .from('parent_links')
      .select('student_id, expires_at, claimed_at, revoked_at, students(groups(school_id))')
      .eq('parent_auth_id', user.id)
    isParent = (links ?? []).some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (l: any) => grantsAccess(l) && l.students?.groups?.school_id === school.id
    )
  }
  if (!isTeacher && !isParent) return <Denied />

  // Membership verified above → school-wide announcements via service role.
  const announcements = await getActiveAnnouncements(service, school.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: staff } = await (service as any)
    .from('teachers')
    .select('full_name, role_type, subject')
    .eq('school_id', school.id)
    .order('full_name')

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-border bg-card px-6 py-5">
        <div className="flex items-center gap-4">
          {school.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logo_url} alt={school.name} className="h-12 w-auto object-contain" />
          ) : (
            <p className="text-xs font-medium uppercase tracking-wide text-primary">MaestraIA</p>
          )}
          <div>
            <h1
              className="text-2xl font-semibold font-display text-text-primary"
              style={school.brand_color ? { color: school.brand_color } : undefined}
            >
              {school.name}
            </h1>
            {school.city && <p className="text-sm text-text-secondary">{school.city}</p>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {announcements.length > 0 && (
          <section className="rounded-xl border-2 border-border bg-card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Avisos de la escuela</h2>
            <SchoolAnnouncements items={announcements} />
          </section>
        )}
        <section className="rounded-xl border-2 border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-2">Tu espacio</h2>
          <div className="flex flex-wrap gap-2">
            {isTeacher ? (
              <>
                <Portal href="/dashboard" label="Mi tablero" />
                <Portal href="/grupos" label="Mis grupos" />
                <Portal href="/planeaciones" label="Planeaciones" />
                {teacher?.role_type === 'admin' && <Portal href="/red" label="Administración" />}
              </>
            ) : (
              <Portal href="/familia" label="Portal de familias" />
            )}
          </div>
        </section>
        <section className="rounded-xl border-2 border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Equipo docente</h2>
          <ul className="space-y-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(staff ?? []).map((t: any, i: number) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="text-text-primary">{t.full_name}</span>
                <span className="text-xs text-text-secondary">
                  {t.role_type === 'admin'
                    ? 'Dirección'
                    : t.role_type === 'coordinator'
                      ? 'Coordinación'
                      : (t.subject ?? 'Docente')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

function Portal({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-primary"
    >
      {label}
    </Link>
  )
}

function Denied() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-6 text-center">
      <h1 className="text-xl font-semibold text-text-primary">Acceso restringido</h1>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        Este espacio es solo para la comunidad de la escuela. Si crees que deberías tener acceso,
        pide a la dirección o a la maestra de tu hijo/a que te invite con tu correo.
      </p>
      <Link href="/login" className="mt-4 text-sm font-medium text-primary underline">
        Iniciar sesión con otra cuenta
      </Link>
    </div>
  )
}
