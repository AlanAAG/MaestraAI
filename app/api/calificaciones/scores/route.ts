// GET /api/calificaciones/scores?group_id=<uuid|all>
// Returns the teacher's Richmond groups + all their assignments + per-student submission
// status, with names DECRYPTED server-side. Richmond scores are effectively binary
// (entregado / no entregado), so the UI works off `done`, not numeric scores.
// RLS scopes every row to the authenticated teacher's groups.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { decrypt } from '@/lib/encryption'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success, headers } = await checkRateLimit(user.id, 'standard')
  if (!success)
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

  const groupParam = new URL(req.url).searchParams.get('group_id') // specific uuid, or null/"all"

  // The teacher's groups (RLS-scoped) — drives the filter UI.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: groupRows } = await (supabase as any)
    .from('groups')
    .select('id, name, grade')
    .order('name')
  const groups = (groupRows ?? []) as Array<{ id: string; name: string; grade: string }>

  // Assignments: filter to one group, or all the teacher's groups (RLS already limits to theirs).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let aq = (supabase as any)
    .from('richmond_assignments')
    .select('id, group_id, title, due_at, total_students, total_submitted')
    .order('due_at', { ascending: true })
  if (groupParam && groupParam !== 'all') aq = aq.eq('group_id', groupParam)
  const { data: assignData } = await aq

  const assignments = (assignData ?? []) as Array<{
    id: string
    group_id: string
    title: string
    due_at: string
    total_students: number
    total_submitted: number
  }>
  if (assignments.length === 0) return NextResponse.json({ groups, assignments: [], students: [] })

  const assignmentIds = assignments.map((a) => a.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scoreData } = await (supabase as any)
    .from('richmond_scores')
    .select(
      'assignment_id, student_id, richmond_student_id, first_name_encrypted, last_name_encrypted, done, total_score'
    )
    .in('assignment_id', assignmentIds)

  type Row = {
    assignment_id: string
    student_id: string | null
    richmond_student_id: string
    first_name_encrypted: string | null
    last_name_encrypted: string | null
    done: boolean
    total_score: number | null
  }
  const rows = (scoreData ?? []) as Row[]

  // Stable per-student key: prefer the linked students.id; fall back to richmond_student_id
  // (only matters for legacy rows synced before student linking).
  const keyOf = (r: Row) => r.student_id ?? `rid:${r.richmond_student_id}`

  // Decrypt each student's name once.
  const nameCache = new Map<string, { first: string; last: string }>()
  for (const r of rows) {
    const k = keyOf(r)
    if (nameCache.has(k)) continue
    nameCache.set(k, {
      first: r.first_name_encrypted ? await decrypt(r.first_name_encrypted) : '',
      last: r.last_name_encrypted ? await decrypt(r.last_name_encrypted) : '',
    })
  }

  // Pivot into one record per student with their per-assignment submission status.
  type Student = {
    id: string | null // students.id when linked (used for /alumnos/[id] drill-down)
    key: string
    first: string
    last: string
    group_id: string
    submitted: Record<string, boolean> // assignment_id -> done
  }
  const studentMap = new Map<string, Student>()
  // assignment_id -> group_id, so a student's group is known from their first score row.
  const groupByAssignment = new Map(assignments.map((a) => [a.id, a.group_id]))
  for (const r of rows) {
    const k = keyOf(r)
    let s = studentMap.get(k)
    if (!s) {
      const name = nameCache.get(k)!
      s = {
        id: r.student_id,
        key: k,
        first: name.first,
        last: name.last,
        group_id: groupByAssignment.get(r.assignment_id) ?? '',
        submitted: {},
      }
      studentMap.set(k, s)
    }
    s.submitted[r.assignment_id] = r.done
  }

  const students = Array.from(studentMap.values()).sort((a, b) =>
    `${a.last}${a.first}`.localeCompare(`${b.last}${b.first}`)
  )

  // Recompute total_submitted from the actual score rows so the header count always
  // matches what the expanded student list shows. The pre-aggregated field in
  // richmond_assignments can drift when score rows are updated without re-syncing the aggregate.
  const submittedByAssignment = new Map<string, number>()
  const studentsByAssignment = new Map<string, number>()
  for (const r of rows) {
    studentsByAssignment.set(r.assignment_id, (studentsByAssignment.get(r.assignment_id) ?? 0) + 1)
    if (r.done)
      submittedByAssignment.set(
        r.assignment_id,
        (submittedByAssignment.get(r.assignment_id) ?? 0) + 1
      )
  }
  const processedAssignments = assignments.map((a) => {
    const rowCount = studentsByAssignment.get(a.id) ?? 0
    return {
      ...a,
      // Use computed count if we have score rows; fall back to stored value only when rows are absent.
      total_submitted: rowCount > 0 ? (submittedByAssignment.get(a.id) ?? 0) : a.total_submitted,
      total_students: rowCount > 0 ? Math.max(a.total_students, rowCount) : a.total_students,
    }
  })

  return NextResponse.json({ groups, assignments: processedAssignments, students })
}
