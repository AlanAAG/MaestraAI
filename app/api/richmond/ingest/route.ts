// app/api/richmond/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { type RichmondAssignment } from '@/lib/richmond/client'
import { verifyApiKey, extractKeyPrefix } from '@/lib/api-keys'

const IngestInputSchema = z.object({
  group_id: z.string().uuid(),
  data: z.array(z.any()),
})

export async function POST(req: NextRequest) {
  const supabase = createClient()

  // Auth: Validate API key
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
  }

  // Get API key from database by prefix
  const keyPrefix = extractKeyPrefix(token)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: apiKey, error: keyError } = await (supabase as any)
    .from('api_keys')
    .select('teacher_id, key_hash')
    .eq('key_prefix', keyPrefix)
    .is('revoked_at', null)
    .single()

  if (keyError || !apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  // Verify API key hash
  const isValid = await verifyApiKey(token, apiKey.key_hash)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  // Update last_used_at timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_prefix', keyPrefix)

  // Parse input
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = IngestInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { group_id, data } = parsed.data
  const assignments = data as RichmondAssignment[]

  // Verify group ownership (prevent cross-tenant injection)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group, error: groupError } = await (supabase as any)
    .from('groups')
    .select('titular_teacher_id')
    .eq('id', group_id)
    .single()

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.titular_teacher_id !== apiKey.teacher_id) {
    return NextResponse.json(
      { error: 'Forbidden: You do not have access to this group' },
      { status: 403 }
    )
  }

  let syncedCount = 0
  const errors: string[] = []

  // Get students for this group
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, richmond_student_id, first_name_encrypted, last_name_encrypted')
    .eq('group_id', group_id)

  if (studentsError || !students) {
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }

  type Student = {
    id: string
    richmond_student_id: string | null
    first_name_encrypted: string
    last_name_encrypted: string
  }
  const typedStudents = students as unknown as Student[]

  // Process each assignment
  for (const assignment of assignments) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dbAssignment, error: assignmentError } = await (supabase as any)
      .from('richmond_assignments')
      .upsert(
        {
          group_id,
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

    // Process scores
    for (const score of assignment.students) {
      let matchedStudent = typedStudents.find(
        (s) => s.richmond_student_id === score.richmond_student_id
      )

      if (!matchedStudent) {
        const normalizedFirst = score.first_name.trim().toUpperCase()
        const normalizedLast = score.last_name.trim().toUpperCase()

        matchedStudent = typedStudents.find((s) => {
          const studentFirst = s.first_name_encrypted.trim().toUpperCase()
          const studentLast = s.last_name_encrypted.trim().toUpperCase()
          return studentFirst === normalizedFirst && studentLast === normalizedLast
        })

        if (matchedStudent && !matchedStudent.richmond_student_id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('students')
            .update({ richmond_student_id: score.richmond_student_id })
            .eq('id', matchedStudent.id)

          matchedStudent.richmond_student_id = score.richmond_student_id
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbAssignmentTyped = dbAssignment as any as { id: string }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: scoreError } = await (supabase as any).from('richmond_scores').upsert(
        {
          assignment_id: dbAssignmentTyped.id,
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

      if (!scoreError) {
        syncedCount++
      }
    }
  }

  return NextResponse.json({ ok: true, synced: syncedCount, errors })
}
