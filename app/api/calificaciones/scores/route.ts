// GET /api/calificaciones/scores?group_id=<uuid>
// Returns a group's recent assignments + scores with names DECRYPTED server-side.
// The page can't read encrypted columns from the browser (no key there), so this
// route does the decryption. RLS scopes rows to the authenticated teacher's groups.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { decrypt } from '@/lib/encryption'

const QuerySchema = z.object({ group_id: z.string().uuid() })

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { success, headers } = await checkRateLimit(user.id, 'standard')
  if (!success)
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

  const parsed = QuerySchema.safeParse({ group_id: new URL(req.url).searchParams.get('group_id') })
  if (!parsed.success) return NextResponse.json({ error: 'Invalid group_id' }, { status: 400 })
  const { group_id } = parsed.data

  // Recent assignments for the group (RLS ensures it's the teacher's group).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignData } = await (supabase as any)
    .from('richmond_assignments')
    .select('id, title, due_at, total_students, total_submitted')
    .eq('group_id', group_id)
    .order('due_at', { ascending: false })
    .limit(20)

  const assignments = (assignData ?? []) as Array<{ id: string; title: string; due_at: string }>
  if (assignments.length === 0) return NextResponse.json({ assignments: [], scores: [] })

  const assignmentIds = assignments.map((a) => a.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scoreData } = await (supabase as any)
    .from('richmond_scores')
    .select(
      'assignment_id, richmond_student_id, first_name_encrypted, last_name_encrypted, total_score, done'
    )
    .in('assignment_id', assignmentIds)

  type Row = {
    assignment_id: string
    richmond_student_id: string
    first_name_encrypted: string | null
    last_name_encrypted: string | null
    total_score: number | null
    done: boolean
  }
  const rows = (scoreData ?? []) as Row[]

  // Decrypt each student's name once, not once per score row.
  const nameCache = new Map<string, { first: string; last: string }>()
  for (const r of rows) {
    if (nameCache.has(r.richmond_student_id)) continue
    nameCache.set(r.richmond_student_id, {
      first: r.first_name_encrypted ? await decrypt(r.first_name_encrypted) : '',
      last: r.last_name_encrypted ? await decrypt(r.last_name_encrypted) : '',
    })
  }

  const scores = rows.map((r) => {
    const name = nameCache.get(r.richmond_student_id)!
    return {
      assignment_id: r.assignment_id,
      richmond_student_id: r.richmond_student_id,
      first_name: name.first,
      last_name: name.last,
      total_score: r.total_score,
      done: r.done,
    }
  })

  return NextResponse.json({ assignments, scores })
}
