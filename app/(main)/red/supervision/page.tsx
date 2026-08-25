// /red/supervision — read-only oversight for the director: what every teacher of the school
// has produced (planeaciones, materiales/juegos, diarios, anuncios, solicitudes). All queries run
// USER-SCOPED so the RLS SELECT policies of migration 082 are the actual authorization — nothing
// here can write, and a non-admin sees only their own rows (and is redirected anyway).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { summarizeByTeacher } from '@/lib/school/oversight'
import { SupervisionFilter } from './SupervisionFilter'

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

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  const [
    { data: staff },
    { data: planes },
    { data: materiales },
    { data: posts },
    { data: diaries },
    { data: requests },
  ] = await Promise.all([
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
    // Diary entries in the last 30 days — used for count per teacher
    sb.from('teacher_diary').select('teacher_id').gte('week_start', thirtyDaysAgo),
    // Pending school requests — count per teacher + school-wide total
    service
      .from('school_requests')
      .select('teacher_id, status')
      .eq('school_id', me.school_id)
      .eq('status', 'pending'),
  ])

  const summaries = summarizeByTeacher(planes ?? [], materiales ?? [], posts ?? [])
  const byTeacher = Object.fromEntries(summaries.map((s) => [s.teacherId, s]))

  // Diary counts per teacher (last 30 days)
  const diaryCountByTeacher: Record<string, number> = {}
  for (const d of diaries ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tid = (d as any).teacher_id as string
    diaryCountByTeacher[tid] = (diaryCountByTeacher[tid] ?? 0) + 1
  }

  // Pending requests per teacher
  const pendingRequestsByTeacher: Record<string, number> = {}
  for (const r of requests ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tid = (r as any).teacher_id as string
    pendingRequestsByTeacher[tid] = (pendingRequestsByTeacher[tid] ?? 0) + 1
  }

  // School-wide stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planesThisMonth = (planes ?? []).filter((p: any) => p.start_date >= thisMonthStart).length
  const totalPendingRequests = (requests ?? []).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold font-display text-text-primary">Supervisión</h1>
        <Link href="/red" className="text-sm text-text-secondary underline">
          Volver a la red
        </Link>
      </div>
      <p className="text-sm text-text-secondary mb-6">
        Vista de solo lectura del trabajo de cada maestra de tu escuela.
      </p>

      {/* School-wide stat bar */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Planeaciones este mes', value: planesThisMonth },
          { label: 'Materiales y juegos', value: (materiales ?? []).length },
          { label: 'Solicitudes pendientes', value: totalPendingRequests },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-secondary mt-1">{label}</p>
          </div>
        ))}
      </div>

      <SupervisionFilter
        staff={staff ?? []}
        byTeacher={byTeacher}
        diaryCountByTeacher={diaryCountByTeacher}
        pendingRequestsByTeacher={pendingRequestsByTeacher}
      />
    </div>
  )
}
