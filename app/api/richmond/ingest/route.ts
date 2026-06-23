// app/api/richmond/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifyApiKey, extractKeyPrefix } from '@/lib/api-keys'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'
import { encrypt } from '@/lib/encryption'
import { mapAssignment } from '@/lib/richmond/map'

// Richmond is an external API we don't control — never reject on its shape.
// Accept any array of objects; map fields defensively (see lib/richmond/map.ts).
const IngestInputSchema = z.object({
  group_id: z.string().uuid(),
  data: z.array(z.record(z.string(), z.unknown())),
})

export async function POST(req: NextRequest) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

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

  // Rate limiting - standard tier (50/hour for bulk data ingest)
  // Use teacher_id from API key as identifier
  const { success, headers } = await checkRateLimit(apiKey.teacher_id, 'standard')
  if (!success) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
      { status: 429, headers }
    )
  }

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

  const { group_id, data: rawAssignments } = parsed.data
  const assignments = rawAssignments.map(mapAssignment)

  // Log shapes (keys only, no student PII) to confirm field mapping in server logs.
  const firstRawStudent = (rawAssignments[0]?.students ??
    rawAssignments[0]?.scores ??
    rawAssignments[0]?.student_scores) as unknown[] | undefined
  console.log('[MaestraAI ingest] assignment keys:', Object.keys(rawAssignments[0] ?? {}))
  console.log(
    '[MaestraAI ingest] student keys:',
    Object.keys((firstRawStudent?.[0] as object) ?? {})
  )
  console.log(
    '[MaestraAI ingest] mapped sample (no names):',
    JSON.stringify({
      id: assignments[0]?.id,
      title: assignments[0]?.title,
      studentCount: assignments[0]?.students.length,
      firstStudentScore: assignments[0]?.students[0]?.score,
      firstStudentRid: assignments[0]?.students[0]?.rid ? 'present' : 'MISSING',
    })
  )
  console.log('[MaestraAI ingest] total items:', assignments.length)

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: students, error: studentsError } = await (supabase as any)
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

  // richmond_student_id -> students.id, for linking scores and skipping re-creation.
  const studentIdByRid = new Map<string, string>()
  for (const s of typedStudents) {
    if (s.richmond_student_id) studentIdByRid.set(s.richmond_student_id, s.id)
  }

  // Auto-create the roster from Richmond: every Richmond student we don't already
  // have becomes a students row (encrypted names, linked to the group → school + teacher).
  const richmondStudents = new Map<string, { first: string; last: string }>()
  for (const a of assignments) {
    for (const s of a.students) {
      if (s.rid && !richmondStudents.has(s.rid)) {
        richmondStudents.set(s.rid, { first: s.first, last: s.last })
      }
    }
  }
  const toCreate = Array.from(richmondStudents.entries()).filter(
    ([rid]) => !studentIdByRid.has(rid)
  )
  if (toCreate.length > 0) {
    const newRows = await Promise.all(
      toCreate.map(async ([rid, name]) => ({
        group_id,
        display_name: `${name.first} ${name.last}`.trim() || 'Estudiante',
        first_name_encrypted: await encrypt(name.first),
        last_name_encrypted: await encrypt(name.last),
        richmond_student_id: rid,
      }))
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error: createErr } = await (supabase as any)
      .from('students')
      .insert(newRows)
      .select('id, richmond_student_id')
    if (createErr) {
      console.error('[MaestraAI ingest] failed to auto-create students:', createErr.message)
    } else {
      for (const s of (created ?? []) as { id: string; richmond_student_id: string }[]) {
        studentIdByRid.set(s.richmond_student_id, s.id)
      }
    }
  }

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

    // Skip students with no usable id — they'd collide on the (assignment_id, richmond_student_id) key.
    const validStudents = assignment.students.filter((s) => s.rid !== '')

    // Batch upsert all student records for this assignment in a single round trip.
    // Encrypt names in parallel, then send one upsert call instead of one per student.
    if (validStudents.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbAssignmentTyped = dbAssignment as any as { id: string }
      const rows = await Promise.all(
        validStudents.map(async (student) => {
          return {
            assignment_id: dbAssignmentTyped.id,
            student_id: studentIdByRid.get(student.rid) ?? null,
            richmond_student_id: student.rid,
            first_name_encrypted: await encrypt(student.first),
            last_name_encrypted: await encrypt(student.last),
            progress: student.progress,
            total_score: student.score,
            done: student.done,
            synced_at: new Date().toISOString(),
          }
        })
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: batchError } = await (supabase as any)
        .from('richmond_scores')
        .upsert(rows, { onConflict: 'assignment_id,richmond_student_id' })

      if (!batchError) {
        syncedCount += rows.length
      } else {
        errors.push(`Failed to upsert students for "${assignment.title}": ${batchError.message}`)
      }
    }
  }

  // Audit log - Richmond data ingest (Chrome extension)
  await logAudit({
    teacher_id: apiKey.teacher_id,
    action: AUDIT_ACTIONS.RICHMOND_CSV_IMPORT,
    resource_type: 'richmond_ingest',
    resource_id: group_id,
    metadata: {
      synced_count: syncedCount,
      error_count: errors.length,
      assignments_count: assignments.length,
    },
    req,
  })

  return NextResponse.json({ ok: true, synced: syncedCount, errors })
}
