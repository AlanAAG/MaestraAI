// GET /api/students/[id]
// One student with name DECRYPTED server-side (no plaintext display_name column exists).
// Ownership-checked; used by the student detail page.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { decryptName } from '@/lib/students/name'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success, headers } = await checkRateLimit(user.id, 'standard')
  if (!success)
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: student } = await (supabase as any)
    .from('students')
    .select(
      'id, group_id, has_nee, observation_day, level, richmond_student_id, first_name_encrypted, last_name_encrypted, parent_contact_encrypted, groups(name, grade, titular_teacher_id)'
    )
    .eq('id', params.id)
    .single()

  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (student.groups?.titular_teacher_id !== teacher.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { first, last, name } = await decryptName(student)
  return NextResponse.json({
    id: student.id,
    name,
    first,
    last,
    has_nee: student.has_nee,
    group_id: student.group_id,
    observation_day: student.observation_day,
    richmond_student_id: student.richmond_student_id,
    has_contact: !!student.parent_contact_encrypted,
    group_name: student.groups?.name ?? '',
    group_grade: student.groups?.grade ?? '',
  })
}
