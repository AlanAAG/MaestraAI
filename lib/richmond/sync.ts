// lib/richmond/sync.ts
import { SupabaseClient } from '@supabase/supabase-js'
import { fetchAssignmentScores, RichmondSessionExpiredError } from './client'

export interface SyncResult {
  synced: number
  errors: string[]
  status: 'success' | 'error' | 'session_expired'
}

/**
 * Syncs Richmond assignments and scores for a group.
 */
export async function syncGroup(
  groupId: string,
  teacherId: string,
  supabase: SupabaseClient
): Promise<SyncResult> {
  const errors: string[] = []
  let syncedCount = 0

  // Create sync log entry
  const { data: logEntry, error: logError } = await supabase
    .from('richmond_sync_log')
    .insert({
      group_id: groupId,
      teacher_id: teacherId,
      status: 'in_progress',
      source: 'manual',
    })
    .select()
    .single()

  if (logError || !logEntry) {
    return { synced: 0, errors: ['Failed to create sync log'], status: 'error' }
  }

  try {
    // Get group details
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('richmond_course_module_uuid')
      .eq('id', groupId)
      .single()

    if (groupError || !group?.richmond_course_module_uuid) {
      throw new Error('Group not found or missing Richmond UUID')
    }

    // Get Richmond credentials
    const { data: credentials, error: credsError } = await supabase
      .from('richmond_credentials')
      .select('session_encrypted, is_valid')
      .eq('group_id', groupId)
      .single()

    if (credsError || !credentials) {
      throw new Error('Richmond credentials not found for this group')
    }

    if (!credentials.is_valid) {
      throw new RichmondSessionExpiredError()
    }

    // Fetch assignments from Richmond
    const assignments = await fetchAssignmentScores(
      group.richmond_course_module_uuid,
      credentials.session_encrypted
    )

    // Get all students for this group
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, richmond_student_id, first_name_encrypted, last_name_encrypted')
      .eq('group_id', groupId)

    if (studentsError || !students) {
      throw new Error('Failed to fetch students')
    }

    // Process each assignment
    for (const assignment of assignments) {
      // Upsert assignment
      const { data: dbAssignment, error: assignmentError } = await supabase
        .from('richmond_assignments')
        .upsert(
          {
            group_id: groupId,
            richmond_id: assignment.id,
            title: assignment.title,
            instructions: assignment.instructions,
            assigned_at: assignment.assigned_at,
            due_at: assignment.due_at,
            total_students: assignment.total_students,
            total_submitted: assignment.total_submitted,
            class_avg_score: assignment.class_avg_score,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'group_id,richmond_id' }
        )
        .select()
        .single()

      if (assignmentError || !dbAssignment) {
        errors.push(`Failed to upsert assignment ${assignment.title}`)
        continue
      }

      // Process each student score
      for (const score of assignment.students) {
        // Match student: first by richmond_student_id, then by name fuzzy match
        let matchedStudent = students.find((s) => s.richmond_student_id === score.richmond_student_id)

        if (!matchedStudent) {
          // Fuzzy match by name (case-insensitive, trimmed)
          const normalizedFirst = score.first_name.trim().toUpperCase()
          const normalizedLast = score.last_name.trim().toUpperCase()

          matchedStudent = students.find((s) => {
            const studentFirst = s.first_name_encrypted.trim().toUpperCase()
            const studentLast = s.last_name_encrypted.trim().toUpperCase()
            return studentFirst === normalizedFirst && studentLast === normalizedLast
          })

          // Update richmond_student_id if matched
          if (matchedStudent && !matchedStudent.richmond_student_id) {
            await supabase
              .from('students')
              .update({ richmond_student_id: score.richmond_student_id })
              .eq('id', matchedStudent.id)

            // Update local cache
            matchedStudent.richmond_student_id = score.richmond_student_id
          }
        }

        // Upsert score
        const { error: scoreError } = await supabase.from('richmond_scores').upsert(
          {
            assignment_id: dbAssignment.id,
            student_id: matchedStudent?.id ?? null,
            richmond_student_id: score.richmond_student_id,
            first_name: score.first_name,
            last_name: score.last_name,
            progress: score.progress,
            total_score: score.total_score,
            done: score.done,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'assignment_id,richmond_student_id' }
        )

        if (scoreError) {
          errors.push(`Failed to upsert score for ${score.first_name} ${score.last_name}`)
        } else {
          syncedCount++
        }
      }
    }

    // Update sync log as success
    await supabase
      .from('richmond_sync_log')
      .update({
        status: 'success',
        completed_at: new Date().toISOString(),
        assignments_synced: assignments.length,
        scores_synced: syncedCount,
      })
      .eq('id', logEntry.id)

    return { synced: syncedCount, errors, status: 'success' }
  } catch (error) {
    const isSessionExpired = error instanceof RichmondSessionExpiredError
    const status = isSessionExpired ? 'session_expired' : 'error'
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Mark credentials as invalid if session expired
    if (isSessionExpired) {
      await supabase
        .from('richmond_credentials')
        .update({ is_valid: false })
        .eq('group_id', groupId)
    }

    // Update sync log as failed
    await supabase
      .from('richmond_sync_log')
      .update({
        status,
        completed_at: new Date().toISOString(),
        error_message: errorMessage,
      })
      .eq('id', logEntry.id)

    return { synced: syncedCount, errors: [errorMessage, ...errors], status }
  }
}
