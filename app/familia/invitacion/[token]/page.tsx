// Public invite landing — a parent opens the emailed link here. Service-role lookup by exact
// token (same pattern as /jugar and /compartir); shows child-free info only.
import { createServiceClient } from '@/lib/supabase/service'
import { linkStatus } from '@/lib/parents/links'
import { ClaimInvite } from './ClaimInvite'

export const dynamic = 'force-dynamic'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold text-text-primary mb-6">MaestraIA</h1>
        {children}
      </div>
    </div>
  )
}

export default async function InvitePage({ params }: { params: { token: string } }) {
  const token = params.token
  if (!/^[a-f0-9]{32}$/.test(token)) {
    return (
      <Shell>
        <p className="text-text-secondary">Esta invitación no es válida.</p>
      </Shell>
    )
  }

  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: link } = await (service as any)
    .from('parent_links')
    .select('id, expires_at, claimed_at, revoked_at, teachers(full_name)')
    .eq('invite_token', token)
    .single()

  if (!link || link.revoked_at) {
    return (
      <Shell>
        <p className="text-text-secondary">Esta invitación no es válida o fue cancelada.</p>
      </Shell>
    )
  }

  const status = linkStatus(link)
  if (status === 'expirado') {
    return (
      <Shell>
        <p className="text-text-secondary">
          Esta invitación venció. Pide a la maestra que te envíe una nueva.
        </p>
      </Shell>
    )
  }
  if (status === 'activo') {
    return (
      <Shell>
        <p className="text-text-secondary mb-4">Esta invitación ya fue utilizada.</p>
        <a href="/login" className="text-primary hover:underline font-medium">
          Inicia sesión para ver el progreso
        </a>
      </Shell>
    )
  }

  const teacherName = link.teachers?.full_name ?? 'tu maestra'
  return (
    <Shell>
      <p className="text-text-secondary mb-6">
        La maestra <strong className="text-text-primary">{teacherName}</strong> te invita a crear
        una cuenta para ver las tareas y los juegos de tu hijo/a.
      </p>
      <ClaimInvite token={token} />
    </Shell>
  )
}
