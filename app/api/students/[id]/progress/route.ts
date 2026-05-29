import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

// Map Richmond internal tracking to NEM qualitative bands
// Richmond stores numeric data for platform compliance, but we display qualitative
function convertToQualitative(internalScore: number | null): string {
  if (internalScore === null) return 'Sin evaluar'
  if (internalScore >= 90) return 'Logrado'
  if (internalScore >= 70) return 'En proceso'
  return 'Requiere apoyo'
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const studentId = params.id

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting - relaxed tier (100/hour for read-only operations)
    const { success, headers } = await checkRateLimit(user.id, 'relaxed')
    if (!success) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
        { status: 429, headers }
      )
    }

    // Verify student belongs to teacher's groups
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: student } = await (supabase as any)
      .from('students')
      .select('*, groups(titular_teacher_id)')
      .eq('id', studentId)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!teacher || student.groups?.titular_teacher_id !== teacher.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Load Richmond data with assignment details
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: richmondData } = await (supabase as any)
      .from('richmond_scores')
      .select(
        `
        *,
        richmond_assignments(
          title,
          assigned_at,
          due_at,
          is_test
        )
      `
      )
      .eq('student_id', studentId)
      .order('synced_at', { ascending: true })

    // Transform Richmond tracking data into qualitative assignments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignments = (richmondData || []).map((item: any) => ({
      date: item.richmond_assignments?.assigned_at || item.synced_at,
      assignment_title: item.richmond_assignments?.title || 'Sin título',
      internal_value: item.total_score, // Keep for chart rendering only
      source: 'richmond' as const,
      qualitative: convertToQualitative(item.total_score),
      done: item.done || false,
    }))

    // Load fortnights where student's group was active
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fortnights } = await (supabase as any)
      .from('fortnights')
      .select('number, project_name, start_date, end_date')
      .eq('group_id', student.group_id)
      .order('start_date', { ascending: false })

    // Load teacher observations for this student
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: observations } = await (supabase as any)
      .from('teacher_observations')
      .select('observed_date, lesson_plan_id')
      .eq('student_id', studentId)
      .order('observed_date', { ascending: false })

    return NextResponse.json({
      assignments: assignments || [],
      fortnights: fortnights || [],
      observations: observations || [],
    })
  } catch (err) {
    console.error('Error loading student progress:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
