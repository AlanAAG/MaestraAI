// GET /api/students?group_id=<uuid|all>
// Roster with names DECRYPTED server-side. Replaces direct browser reads of the (now
// removed) plaintext display_name column. RLS scopes rows to the teacher's groups.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { decryptName, normalizeName } from '@/lib/students/name'
import { encrypt } from '@/lib/encryption'

// POST: manually add a student to a group. Names are normalized (Title Case) + encrypted, so a
// later Richmond sync (which matches case-insensitively by name) links to this same row.
const CreateSchema = z.object({
  group_id: z.string().uuid(),
  first_name: z.string().min(1).max(60),
  last_name: z.string().min(1).max(60),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    const body = CreateSchema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

    // Verify the group belongs to this teacher (RLS also enforces, this gives a clean 403).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: group } = await (supabase as any)
      .from('groups')
      .select('id')
      .eq('id', body.data.group_id)
      .eq('titular_teacher_id', teacher.id)
      .single()
    if (!group) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 })

    const first = normalizeName(body.data.first_name)
    const last = normalizeName(body.data.last_name)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('students')
      .insert({
        group_id: body.data.group_id,
        first_name_encrypted: await encrypt(first),
        last_name_encrypted: await encrypt(last),
      })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: 'No pude agregar al alumno.' }, { status: 500 })

    return NextResponse.json({ student: { id: data.id, first, last, name: `${first} ${last}` } })
  } catch (err) {
    console.error('POST /api/students error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success, headers } = await checkRateLimit(user.id, 'standard')
  if (!success)
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

  const groupParam = new URL(req.url).searchParams.get('group_id')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (supabase as any)
    .from('students')
    .select(
      'id, group_id, has_nee, observation_day, level, richmond_student_id, first_name_encrypted, last_name_encrypted, parent_contact_encrypted, groups(name, grade)'
    )
  if (groupParam && groupParam !== 'all') q = q.eq('group_id', groupParam)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: 'Failed to load students' }, { status: 500 })

  type Row = {
    id: string
    group_id: string
    has_nee: boolean
    observation_day: string | null
    level: string | null
    richmond_student_id: string | null
    first_name_encrypted: string | null
    last_name_encrypted: string | null
    parent_contact_encrypted: string | null
    groups: { name: string; grade: string } | null
  }

  const students = await Promise.all(
    ((data ?? []) as Row[]).map(async (r) => {
      const { first, last, name } = await decryptName(r)
      return {
        id: r.id,
        group_id: r.group_id,
        name,
        first,
        last,
        has_nee: r.has_nee,
        observation_day: r.observation_day,
        level: r.level,
        richmond_student_id: r.richmond_student_id,
        group_name: r.groups?.name ?? '',
        group_grade: r.groups?.grade ?? '',
        has_contact: !!r.parent_contact_encrypted, // never expose the ciphertext to the browser
      }
    })
  )

  students.sort((a, b) => a.name.localeCompare(b.name))
  return NextResponse.json({ students })
}
