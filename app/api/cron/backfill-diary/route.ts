import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encrypt, decrypt } from '@/lib/encryption'

// One-time backfill: encrypt pre-existing plaintext teacher_diary q1..q5 (migration 045).
// Idempotent — a field that already decrypts is left alone. Run once with the CRON_SECRET bearer:
//   curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/backfill-diary
// Safe to delete this route after a successful run.
const FIELDS = [
  'q1_functioning',
  'q2_challenging',
  'q3_group',
  'q4_adjust',
  'q5_student_obs',
] as const

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabase as any)
    .from('teacher_diary')
    .select(`id, ${FIELDS.join(', ')}`)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let updated = 0
  for (const row of rows ?? []) {
    const patch: Record<string, string> = {}
    for (const f of FIELDS) {
      const val = row[f]
      if (!val) continue
      try {
        await decrypt(val) // already ciphertext → skip
      } catch {
        patch[f] = await encrypt(val) // plaintext → encrypt
      }
    }
    if (Object.keys(patch).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('teacher_diary').update(patch).eq('id', row.id)
      updated++
    }
  }

  return NextResponse.json({ ok: true, scanned: rows?.length ?? 0, updated })
}
