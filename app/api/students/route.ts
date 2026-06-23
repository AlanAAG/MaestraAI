// GET /api/students?group_id=<uuid|all>
// Roster with names DECRYPTED server-side. Replaces direct browser reads of the (now
// removed) plaintext display_name column. RLS scopes rows to the teacher's groups.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { decryptName } from '@/lib/students/name'

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
