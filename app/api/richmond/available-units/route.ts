import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rl = await checkRateLimit(user.id, 'relaxed', 'available-units')
  if (!rl.success)
    return NextResponse.json(
      { error: 'Demasiadas solicitudes.' },
      { status: 429, headers: rl.headers }
    )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!teacher) return NextResponse.json({ units: [] })

  // Get teacher's groups
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: groups } = await (supabase as any)
    .from('groups')
    .select('id')
    .eq('titular_teacher_id', teacher.id)
  const groupIds = (groups ?? []).map((g: { id: string }) => g.id)
  if (groupIds.length === 0) return NextResponse.json({ units: [] })

  // Fetch recent assignments (last 90 days), deduplicate by title
  const since = new Date()
  since.setDate(since.getDate() - 90)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignments } = await (supabase as any)
    .from('richmond_assignments')
    .select('id, title, due_at, group_id, groups(name)')
    .in('group_id', groupIds)
    .gte('due_at', since.toISOString())
    .order('due_at', { ascending: false })
    .limit(60)

  if (!assignments || assignments.length === 0) return NextResponse.json({ units: [] })

  // Parse optional date range for suggesting the best-fit unit
  const url = new URL(req.url)
  const startParam = url.searchParams.get('start')
  const endParam = url.searchParams.get('end')
  const rangeStart = startParam ? new Date(startParam) : null
  const rangeEnd = endParam ? new Date(endParam) : null

  // Deduplicate by normalized title, keep most recent occurrence
  const seen = new Set<string>()
  type UnitItem = {
    assignment_id: string
    title: string
    due_at: string
    group_name: string
    suggested: boolean
  }
  const units: UnitItem[] = []

  for (const a of assignments as {
    id: string
    title: string
    due_at: string
    group_id: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    groups: any
  }[]) {
    const key = a.title.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)

    let suggested = false
    if (rangeStart && rangeEnd) {
      const dueAt = new Date(a.due_at)
      // Suggest units whose due_at falls within or up to 7 days before the fortnight
      const windowStart = new Date(rangeStart)
      windowStart.setDate(windowStart.getDate() - 7)
      suggested = dueAt >= windowStart && dueAt <= rangeEnd
    }

    units.push({
      assignment_id: a.id,
      title: a.title,
      due_at: a.due_at,
      group_name: a.groups?.name ?? '',
      suggested,
    })
  }

  // Move suggested items to front
  units.sort((a, b) => (b.suggested ? 1 : 0) - (a.suggested ? 1 : 0))

  return NextResponse.json({ units })
}
