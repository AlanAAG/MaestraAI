import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseRichmondCSV, matchStudents } from '@/lib/richmond/csv-parser'
import { checkRateLimit } from '@/lib/rate-limit'
import { validateFile } from '@/lib/file-validation'

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

  const teacherId = (teacher as { id: string }).id

  // Rate limiting - strict tier (10/hour for file uploads)
  const { success, headers } = await checkRateLimit(user.id, 'strict')
  if (!success) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
      { status: 429, headers }
    )
  }

  try {
    // Parse multipart form
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // File validation (MIME type, magic bytes, size - replaces basic checks)
    const validation = await validateFile(file, 'csv')
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Parse the CSV/XLSX
    const { data: parsedData, error: parseError } = await parseRichmondCSV(file)

    if (parseError) {
      return NextResponse.json({ error: parseError }, { status: 400 })
    }

    if (parsedData.students.length === 0) {
      return NextResponse.json(
        { error: 'No students found in file. Please check the CSV format.' },
        { status: 400 }
      )
    }

    // Get all teacher's groups to match students
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('titular_teacher_id', teacherId)

    if (groupsError || !groups || groups.length === 0) {
      return NextResponse.json({ error: 'No groups found for teacher' }, { status: 404 })
    }

    const typedGroups = groups as { id: string; name: string }[]

    // Fetch all students from teacher's groups
    const { data: dbStudents, error: studentsError } = await supabase
      .from('students')
      .select('id, group_id, first_name_encrypted, last_name_encrypted')
      .in(
        'group_id',
        typedGroups.map((g) => g.id)
      )

    if (studentsError) {
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    const typedStudents = (dbStudents || []) as {
      id: string
      group_id: string
      first_name_encrypted: string
      last_name_encrypted: string
    }[]

    // Match parsed students to DB students
    const matchedStudents = matchStudents(parsedData.students, typedStudents)

    // Group students by group_id
    const studentsByGroup = new Map<string, typeof matchedStudents>()
    for (const matched of matchedStudents) {
      if (!matched.matchedStudentId) continue

      const dbStudent = typedStudents.find((s) => s.id === matched.matchedStudentId)
      if (!dbStudent) continue

      if (!studentsByGroup.has(dbStudent.group_id)) {
        studentsByGroup.set(dbStudent.group_id, [])
      }
      studentsByGroup.get(dbStudent.group_id)!.push(matched)
    }

    // Build response with group breakdown
    const groupBreakdown = typedGroups
      .map((group) => ({
        groupId: group.id,
        groupName: group.name,
        matchedCount: studentsByGroup.get(group.id)?.length || 0,
      }))
      .filter((g) => g.matchedCount > 0)

    const totalMatched = matchedStudents.filter((s) => s.matchedStudentId).length
    const totalUnmatched = matchedStudents.length - totalMatched

    return NextResponse.json({
      ok: true,
      preview: {
        totalStudents: parsedData.students.length,
        totalAssignments: parsedData.assignments.length,
        matchedStudents: totalMatched,
        unmatchedStudents: totalUnmatched,
        groups: groupBreakdown,
      },
      data: {
        assignments: parsedData.assignments,
        students: matchedStudents,
      },
    })
  } catch (error) {
    console.error('CSV parse error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse file' },
      { status: 500 }
    )
  }
}
