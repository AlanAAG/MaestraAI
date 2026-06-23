import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { decryptName } from '@/lib/students/name'
import {
  computeAverage,
  computeMedian,
  computeMode,
  computeDistribution,
} from '@/lib/richmond/analytics'

const QuerySchema = z.object({
  group_id: z.string().uuid().optional(),
  assignment_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'relaxed', 'richmond-analytics')
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
        { status: 429, headers }
      )
    }

    const parsed = QuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!parsed.success) {
      return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
    }
    const { group_id, assignment_id, student_id } = parsed.data

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Por alumno ─────────────────────────────────────────────────────────
    if (student_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: student } = await (supabase as any)
        .from('students')
        .select('first_name_encrypted, last_name_encrypted, groups(titular_teacher_id)')
        .eq('id', student_id)
        .single()

      if (!student || student.groups?.titular_teacher_id !== teacher.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const { name: studentName } = await decryptName(student)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: scores } = await (supabase as any)
        .from('richmond_scores')
        .select('total_score, done, synced_at, richmond_assignments(title, assigned_at, group_id)')
        .eq('student_id', student_id)
        .order('synced_at', { ascending: false })

      return NextResponse.json({
        student_name: studentName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        scores: (scores || []).map((s: any) => ({
          assignment_title: s.richmond_assignments?.title ?? 'Sin título',
          assigned_at: s.richmond_assignments?.assigned_at ?? s.synced_at,
          total_score: s.total_score,
          done: s.done,
        })),
      })
    }

    // ── Por tarea ──────────────────────────────────────────────────────────
    if (assignment_id) {
      // Ownership: assignment → group → teacher
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assignment } = await (supabase as any)
        .from('richmond_assignments')
        .select('id, title, due_at, total_students, total_submitted, groups(titular_teacher_id)')
        .eq('id', assignment_id)
        .single()

      if (!assignment || assignment.groups?.titular_teacher_id !== teacher.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows } = await (supabase as any)
        .from('richmond_scores')
        .select(
          'total_score, done, student_id, students(first_name_encrypted, last_name_encrypted)'
        )
        .eq('assignment_id', assignment_id)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const numericScores = (rows || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r.total_score)
        .filter((v: number | null): v is number => v !== null)

      const completion_rate =
        assignment.total_students > 0
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (rows || []).filter((r: any) => r.done).length / assignment.total_students
          : 0

      return NextResponse.json({
        assignment: {
          id: assignment.id,
          title: assignment.title,
          due_at: assignment.due_at,
          total_students: assignment.total_students,
          total_submitted: assignment.total_submitted,
        },
        stats: {
          avg: computeAverage(numericScores),
          median: computeMedian(numericScores),
          mode: computeMode(numericScores),
          completion_rate,
          distribution: computeDistribution(numericScores),
        },
        scores: await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (rows || []).map(async (r: any) => ({
            student_display_name: r.students ? (await decryptName(r.students)).name : null,
            total_score: r.total_score,
            done: r.done,
          }))
        ),
      })
    }

    // ── Por grupo ──────────────────────────────────────────────────────────
    if (group_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: group } = await (supabase as any)
        .from('groups')
        .select('titular_teacher_id')
        .eq('id', group_id)
        .single()

      if (!group || group.titular_teacher_id !== teacher.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: assignments } = await (supabase as any)
        .from('richmond_assignments')
        .select('id, title, due_at, total_students, total_submitted, class_avg_score, synced_at')
        .eq('group_id', group_id)
        .order('due_at', { ascending: false })
        .limit(50)

      return NextResponse.json({ assignments: assignments || [] })
    }

    // ── Todos (overview) ───────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: groups } = await (supabase as any)
      .from('groups')
      .select('id, name, richmond_group_name')
      .eq('titular_teacher_id', teacher.id)
      .order('name')

    if (!groups?.length) return NextResponse.json({ overview: [] })

    const groupIds = groups.map((g: { id: string }) => g.id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allAssignments } = await (supabase as any)
      .from('richmond_assignments')
      .select('group_id, class_avg_score, total_students, total_submitted')
      .in('group_id', groupIds)

    // Aggregate per group in JS (teacher scale: tens of groups at most)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aggMap: Record<
      string,
      { count: number; avgSum: number; avgCount: number; submitted: number; students: number }
    > = {}
    for (const g of groups)
      aggMap[g.id] = { count: 0, avgSum: 0, avgCount: 0, submitted: 0, students: 0 }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const a of allAssignments || []) {
      const agg = aggMap[a.group_id]
      if (!agg) continue
      agg.count++
      agg.submitted += a.total_submitted ?? 0
      agg.students += a.total_students ?? 0
      if (a.class_avg_score !== null) {
        agg.avgSum += a.class_avg_score
        agg.avgCount++
      }
    }

    const overview = groups.map(
      (g: { id: string; name: string; richmond_group_name: string | null }) => {
        const agg = aggMap[g.id]
        return {
          id: g.id,
          name: g.richmond_group_name ?? g.name,
          assignment_count: agg.count,
          avg_score: agg.avgCount > 0 ? agg.avgSum / agg.avgCount : null,
          completion_rate: agg.students > 0 ? agg.submitted / agg.students : null,
        }
      }
    )

    return NextResponse.json({ overview })
  } catch (err) {
    console.error('Richmond analytics error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
