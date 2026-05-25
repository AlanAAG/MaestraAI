// app/api/richmond/upload-xlsx/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { read, utils } from 'xlsx'
import { createClient } from '@/lib/supabase/server'

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

  // Get teacher
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (teacherError || !teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  const teacherId = (teacher as any).id as string

  // Parse multipart form
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const groupId = formData.get('group_id') as string | null

  if (!file || !groupId) {
    return NextResponse.json({ error: 'Missing file or group_id' }, { status: 400 })
  }

  // Verify teacher owns this group
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id')
    .eq('id', groupId)
    .eq('titular_teacher_id', teacherId)
    .single()

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found or access denied' }, { status: 403 })
  }

  try {
    // Read XLSX file
    const arrayBuffer = await file.arrayBuffer()
    const workbook = read(arrayBuffer, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

    if (data.length < 2) {
      return NextResponse.json({ error: 'File has no data rows' }, { status: 400 })
    }

    // Find column indices flexibly
    const headers = data[0].map((h) => (h || '').toLowerCase().trim())
    const titleIdx = headers.findIndex((h) => h.includes('title') || h.includes('tarea') || h.includes('task'))
    const scoreIdx = headers.findIndex((h) => h.includes('score') || h.includes('puntuación') || h.includes('calificación'))
    const studentIdx = headers.findIndex((h) => h.includes('student') || h.includes('alumno') || h.includes('nombre'))
    const dateIdx = headers.findIndex((h) => h.includes('date') || h.includes('fecha') || h.includes('due'))

    if (titleIdx === -1 || studentIdx === -1) {
      return NextResponse.json(
        { error: 'Required columns not found (need at least title and student)' },
        { status: 400 }
      )
    }

    // Get students for this group
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, richmond_student_id, first_name_encrypted, last_name_encrypted')
      .eq('group_id', groupId)

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

    const errors: string[] = []
    let syncedCount = 0

    // Group rows by assignment title
    const assignmentMap = new Map<string, typeof data>()
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      const title = row[titleIdx]
      if (!title) continue

      if (!assignmentMap.has(title)) {
        assignmentMap.set(title, [])
      }
      assignmentMap.get(title)!.push(row)
    }

    // Process each assignment
    for (const [title, rows] of Array.from(assignmentMap)) {
      const firstRow = rows[0]
      const dueDate = dateIdx !== -1 ? firstRow[dateIdx] : null

      // Create/update assignment (best-effort, no richmond_id)
      const { data: dbAssignment, error: assignmentError } = await (supabase as any)
        .from('richmond_assignments')
        .insert({
          group_id: groupId,
          richmond_id: `xlsx-${Date.now()}-${title.substring(0, 20)}`,
          title,
          instructions: 'Imported from XLSX',
          assigned_at: new Date().toISOString(),
          due_at: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
          total_students: rows.length,
          total_submitted: rows.filter((r: string[]) => r[scoreIdx] != null).length,
          synced_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (assignmentError || !dbAssignment) {
        errors.push(`Failed to create assignment: ${title}`)
        continue
      }

      // Process each score
      for (const row of rows) {
        const studentName = row[studentIdx]
        const scoreValue = scoreIdx !== -1 ? row[scoreIdx] : null

        if (!studentName) continue

        // Split name (basic heuristic)
        const nameParts = studentName.trim().split(/\s+/)
        const firstName = nameParts[0]
        const lastName = nameParts.slice(1).join(' ') || ''

        // Match student by name
        const normalizedFirst = firstName.toUpperCase()
        const normalizedLast = lastName.toUpperCase()

        const matchedStudent = typedStudents.find((s) => {
          const studentFirst = s.first_name_encrypted.trim().toUpperCase()
          const studentLast = s.last_name_encrypted.trim().toUpperCase()
          return studentFirst.includes(normalizedFirst) || normalizedFirst.includes(studentFirst)
        })

        const dbAssignmentTyped = dbAssignment as any as { id: string }
        const { error: scoreError } = await (supabase as any).from('richmond_scores').insert({
          assignment_id: dbAssignmentTyped.id,
          student_id: matchedStudent?.id ?? null,
          richmond_student_id: matchedStudent?.richmond_student_id ?? null,
          first_name: firstName,
          last_name: lastName,
          progress: scoreValue ? 'completed' : 'not_started',
          total_score: scoreValue ? parseFloat(scoreValue) : null,
          done: scoreValue != null,
          synced_at: new Date().toISOString(),
        })

        if (!scoreError) {
          syncedCount++
        }
      }
    }

    return NextResponse.json({ ok: true, synced: syncedCount, errors })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process XLSX file'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
