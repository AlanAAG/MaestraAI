// GET /api/students/[id]
// One student with name DECRYPTED server-side (no plaintext display_name column exists).
// Ownership-checked; used by the student detail page.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { decryptName } from '@/lib/students/name'
import { encrypt, decrypt } from '@/lib/encryption'

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
  // NEE note is encrypted at rest; decrypt for the owning teacher only. Fetched separately +
  // best-effort so a missing column (migration 063 not yet pushed) can't 404 the whole page.
  let neeNote = ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: neeRow } = await (supabase as any)
      .from('students')
      .select('nee_notes_encrypted')
      .eq('id', params.id)
      .single()
    if (neeRow?.nee_notes_encrypted) neeNote = await decrypt(neeRow.nee_notes_encrypted)
  } catch {
    /* column missing or undecryptable → empty */
  }
  return NextResponse.json({
    id: student.id,
    name,
    first,
    last,
    has_nee: student.has_nee,
    nee_note: neeNote,
    group_id: student.group_id,
    observation_day: student.observation_day,
    richmond_student_id: student.richmond_student_id,
    has_contact: !!student.parent_contact_encrypted,
    group_name: student.groups?.name ?? '',
    group_grade: student.groups?.grade ?? '',
  })
}

// PATCH: set the NEE flag + (encrypted) support note for the teacher's own student.
const PatchSchema = z.object({
  has_nee: z.boolean().optional(),
  nee_note: z.string().max(2000).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    const body = PatchSchema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Ownership check (RLS also enforces) — only the group's titular teacher may edit.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: student } = await (supabase as any)
      .from('students')
      .select('id, groups(titular_teacher_id)')
      .eq('id', params.id)
      .single()
    if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (student.groups?.titular_teacher_id !== teacher.id)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const patch: Record<string, unknown> = {}
    if (body.data.has_nee !== undefined) patch.has_nee = body.data.has_nee
    if (body.data.nee_note !== undefined) {
      const note = body.data.nee_note.trim()
      patch.nee_notes_encrypted = note ? await encrypt(note) : null
    }
    if (!Object.keys(patch).length) return NextResponse.json({ ok: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('students').update(patch).eq('id', params.id)
    if (error) return NextResponse.json({ error: 'No se pudo guardar.' }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/students/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
