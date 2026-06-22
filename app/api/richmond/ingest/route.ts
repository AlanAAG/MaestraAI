// app/api/richmond/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifyApiKey, extractKeyPrefix } from '@/lib/api-keys'
import { checkRateLimit } from '@/lib/rate-limit'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'
import { encrypt } from '@/lib/encryption'

// Lenient schema — Richmond's API shape may differ from what was originally assumed.
// All fields beyond group_id are optional with safe defaults so we never 400 on shape changes.
// The actual field mapping is logged server-side for debugging.
const RichmondStudentScoreSchema = z
  .object({
    richmond_student_id: z.union([z.string(), z.number()]).transform(String).optional().default(''),
    first_name: z.string().optional().default(''),
    last_name: z.string().optional().default(''),
    progress: z.string().optional().default('not_started'),
    total_score: z.number().nullish(),
    done: z.boolean().optional().default(false),
  })
  .passthrough()

const RichmondAssignmentSchema = z
  .object({
    // id may be uuid string or integer — coerce to string
    id: z.union([z.string(), z.number()]).transform(String).optional().default('unknown'),
    title: z.string().optional().default('Actividad'),
    instructions: z.string().nullish(),
    assigned_at: z.string().optional().default(''),
    due_at: z.string().optional().default(''),
    total_students: z.number().optional().default(0),
    total_submitted: z.number().optional().default(0),
    class_avg_score: z.number().nullish(),
    students: z.array(RichmondStudentScoreSchema).optional().default([]),
  })
  .passthrough()

const IngestInputSchema = z.object({
  group_id: z.string().uuid(),
  data: z.array(RichmondAssignmentSchema),
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

  const { group_id, data: assignments } = parsed.data

  // Log first item so we can see the actual Richmond payload shape in server logs.
  console.log(
    '[MaestraAI ingest] first item received:',
    JSON.stringify(assignments[0]).slice(0, 600)
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

    // Batch upsert all student records for this assignment in a single round trip.
    // Encrypt names in parallel, then send one upsert call instead of one per student.
    if (assignment.students.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dbAssignmentTyped = dbAssignment as any as { id: string }
      const rows = await Promise.all(
        assignment.students.map(async (student) => {
          const matchedStudent = typedStudents.find(
            (s) => s.richmond_student_id === student.richmond_student_id
          )
          return {
            assignment_id: dbAssignmentTyped.id,
            student_id: matchedStudent?.id ?? null,
            richmond_student_id: student.richmond_student_id,
            first_name_encrypted: await encrypt(student.first_name || ''),
            last_name_encrypted: await encrypt(student.last_name || ''),
            progress: student.progress ?? 'not_started',
            total_score: student.total_score ?? null,
            done: student.done ?? false,
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
