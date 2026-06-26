// Scaffolds the Richmond TG5A catalog: 8 units × 4 lesson groups, STRUCTURE ONLY (empty content
// arrays). Real vocabulary/goals/language_models are filled in per unit later. Idempotent (upserts).
// Run once after migration 056 is applied:
//   npx tsx supabase/seed/richmond_tg5a.ts
// Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local (or .env).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// This runs outside Next.js, which would normally inject .env.local — so load it ourselves.
function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const eq = line.indexOf('=')
        if (eq === -1) continue
        const k = line.slice(0, eq).trim()
        if (!/^[A-Z0-9_]+$/.test(k) || process.env[k]) continue
        // .trim() strips trailing CR/whitespace; then strip surrounding quotes.
        process.env[k] = line
          .slice(eq + 1)
          .trim()
          .replace(/^["']|["']$/g, '')
      }
      break
    } catch {
      /* file not found — try the next */
    }
  }
}
loadEnv()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local). Aborting.'
  )
  process.exit(1)
}
const supabase = createClient(url, key)

const BOOK_CODE = 'TG5A'
const UNIT_COUNT = 8
const LESSON_GROUPS = [
  { lesson_range: '1-4', lesson_start: 1, lesson_end: 4, sort_order: 1 },
  { lesson_range: '5-8', lesson_start: 5, lesson_end: 8, sort_order: 2 },
  { lesson_range: '9-12', lesson_start: 9, lesson_end: 12, sort_order: 3 },
  { lesson_range: '13-16', lesson_start: 13, lesson_end: 16, sort_order: 4 },
]

async function main() {
  for (let n = 1; n <= UNIT_COUNT; n++) {
    const { data: unit, error } = await supabase
      .from('richmond_units')
      .upsert(
        { book_code: BOOK_CODE, unit_number: n, unit_title: `Unit ${n} – TBD` },
        { onConflict: 'book_code,unit_number' }
      )
      .select('id')
      .single()
    if (error) throw error

    for (const g of LESSON_GROUPS) {
      const { error: gErr } = await supabase.from('richmond_lesson_groups').upsert(
        {
          unit_id: unit.id,
          ...g,
          learning_goals: [],
          vocabulary: [],
          language_models: [],
        },
        { onConflict: 'unit_id,lesson_range' }
      )
      if (gErr) throw gErr
    }
    console.log(`Seeded Unit ${n} (${LESSON_GROUPS.length} lesson groups)`)
  }
  console.log(`Done: ${BOOK_CODE} — ${UNIT_COUNT} units × ${LESSON_GROUPS.length} groups.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
