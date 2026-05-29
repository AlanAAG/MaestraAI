import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'

const ImportRequestSchema = z.object({
  assignments: z.array(
    z.object({
      title: z.string(),
      dueDate: z.string().optional(),
      submissions: z.array(
        z.object({
          studentName: z.string(),
          rawValue: z.number().nullable(),
          progress: z.string(),
        })
      ),
    })
  ),
  students: z.array(
    z.object({
      name: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      matchedStudentId: z.string().optional(),
      matchConfidence: z.number().optional(),
    })
  ),
  groupIds: z.array(z.string()),
})

export async function POST(req: NextRequest) {
  const supabase = createClient()

  // Check auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting - standard tier (50/hour for batch imports)
  const { success, headers } = await checkRateLimit(user.id, 'standard')
  if (!success) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
      { status: 429, headers }
    )
  }

  // Get teacher
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (teacherError || !teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  const teacherId = (teacher as { id: string }).id

  try {
    // Parse and validate request body
    const body = await req.json()
    const validated = ImportRequestSchema.parse(body)

    // Verify teacher owns all specified groups
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id')
      .eq('titular_teacher_id', teacherId)
      .in('id', validated.groupIds)

    if (groupsError || !groups || groups.length !== validated.groupIds.length) {
      return NextResponse.json(
        { error: 'One or more groups not found or access denied' },
        { status: 403 }
      )
    }

    // Fetch all matched students to get their group_id
    const matchedStudentIds = validated.students
      .filter((s) => s.matchedStudentId)
      .map((s) => s.matchedStudentId!)

    const { data: dbStudents, error: studentsError } = await supabase
      .from('students')
      .select('id, group_id, richmond_student_id')
      .in('id', matchedStudentIds)

    if (studentsError) {
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    const studentIdToGroupId = new Map<string, string>()
    const studentIdToRichmondId = new Map<string, string | null>()

    for (const s of (dbStudents || []) as {
      id: string
      group_id: string
      richmond_student_id: string | null
    }[]) {
      studentIdToGroupId.set(s.id, s.group_id)
      studentIdToRichmondId.set(s.id, s.richmond_student_id)
    }

    let assignmentsCreated = 0
    let submissionsCreated = 0
    const errors: string[] = []

    // Create sync log entry
    const syncLogPromises = validated.groupIds.map((groupId) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('richmond_sync_log').insert({
        group_id: groupId,
        teacher_id: teacherId,
        status: 'in_progress',
        source: 'csv_import',
      })
    )

    await Promise.all(syncLogPromises)

    // Collect all assignments and scores for batch insert
    const assignmentsToInsert: Array<{
      id: string
      group_id: string
      richmond_id: string
      title: string
      instructions: string
      assigned_at: string
      due_at: string
      total_students: number
      total_submitted: number
      synced_at: string
    }> = []
    const scoresToInsert: Array<{
      assignment_id: string
      student_id: string
      richmond_student_id: string | undefined
      first_name: string
      last_name: string
      progress: string | null
      total_score: number | null
      done: boolean
      synced_at: string
    }> = []

    // Process each assignment
    for (const assignment of validated.assignments) {
      // Group submissions by group_id
      const submissionsByGroup = new Map<string, typeof assignment.submissions>()

      for (const submission of assignment.submissions) {
        const student = validated.students.find((s) => s.name === submission.studentName)
        if (!student?.matchedStudentId) continue

        const groupId = studentIdToGroupId.get(student.matchedStudentId)
        if (!groupId) continue

        if (!submissionsByGroup.has(groupId)) {
          submissionsByGroup.set(groupId, [])
        }
        submissionsByGroup.get(groupId)!.push(submission)
      }

      // Prepare assignments for batch insert
      for (const [groupId, submissions] of Array.from(submissionsByGroup.entries())) {
        const dueDate = assignment.dueDate
          ? new Date(assignment.dueDate).toISOString()
          : new Date().toISOString()

        const completedCount = submissions.filter(
          (s: { rawValue: number | null }) => s.rawValue !== null
        ).length

        const assignmentId = crypto.randomUUID()

        assignmentsToInsert.push({
          id: assignmentId,
          group_id: groupId,
          richmond_id: `csv-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          title: assignment.title,
          instructions: 'Imported from CSV',
          assigned_at: new Date().toISOString(),
          due_at: dueDate,
          total_students: submissions.length,
          total_submitted: completedCount,
          synced_at: new Date().toISOString(),
        })

        // Prepare scores for this assignment
        for (const submission of submissions) {
          const student = validated.students.find((s) => s.name === submission.studentName)
          if (!student?.matchedStudentId) continue

          const richmondStudentId = studentIdToRichmondId.get(student.matchedStudentId)

          scoresToInsert.push({
            assignment_id: assignmentId,
            student_id: student.matchedStudentId,
            richmond_student_id: richmondStudentId,
            first_name: student.firstName,
            last_name: student.lastName,
            progress: submission.progress ?? null,
            total_score: submission.rawValue,
            done: submission.rawValue !== null,
            synced_at: new Date().toISOString(),
          })
        }
      }
    }

    // Batch insert ALL assignments at once
    if (assignmentsToInsert.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: assignmentError } = await (supabase as any)
        .from('richmond_assignments')
        .insert(assignmentsToInsert)

      if (assignmentError) {
        errors.push(`Failed to batch insert assignments: ${assignmentError.message}`)
      } else {
        assignmentsCreated = assignmentsToInsert.length
      }
    }

    // Batch insert ALL scores at once
    if (scoresToInsert.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: scoresError } = await (supabase as any)
        .from('richmond_scores')
        .insert(scoresToInsert)

      if (scoresError) {
        errors.push(`Failed to batch insert scores: ${scoresError.message}`)
      } else {
        submissionsCreated = scoresToInsert.length
      }
    }

    // Update sync logs to completed
    const completeSyncLogPromises = validated.groupIds.map((groupId) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('richmond_sync_log')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          assignments_synced: assignmentsCreated,
          scores_synced: submissionsCreated,
        })
        .eq('group_id', groupId)
        .eq('teacher_id', teacherId)
        .eq('source', 'csv_import')
        .order('started_at', { ascending: false })
        .limit(1)
    )

    await Promise.all(completeSyncLogPromises)

    // Audit log - CSV batch import
    await logAudit({
      teacher_id: teacherId,
      action: AUDIT_ACTIONS.RICHMOND_CSV_IMPORT,
      resource_type: 'richmond_csv_import',
      resource_id: validated.groupIds[0] || 'unknown',
      metadata: {
        assignments_created: assignmentsCreated,
        submissions_created: submissionsCreated,
        student_count: validated.students.filter((s) => s.matchedStudentId).length,
        error_count: errors.length,
        group_count: validated.groupIds.length,
      },
      req,
    })

    return NextResponse.json({
      ok: true,
      summary: {
        assignmentsCreated,
        submissionsCreated,
        studentCount: validated.students.filter((s) => s.matchedStudentId).length,
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (error) {
    console.error('Batch import error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import data' },
      { status: 500 }
    )
  }
}
