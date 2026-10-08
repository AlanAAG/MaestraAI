// Read-only preflight for the planner/homework rollout. Never prints keys or teacher content.
// Run: npm run release:check -- --origin https://maestraia.com
import { existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const args = process.argv.slice(2)
const originIndex = args.indexOf('--origin')
const origin = originIndex >= 0 ? args[originIndex + 1] : process.env.NEXT_PUBLIC_APP_URL
const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
const absent = required.filter((key) => !process.env[key])
if (absent.length) {
  console.error(`Missing environment variables: ${absent.join(', ')}`)
  process.exit(1)
}
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(15000) }),
    },
  }
)
let failures = 0
function report(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`)
  if (!ok) failures++
}
const requirements = [
  [
    'fortnights',
    'id,format_template_id,use_system_template,grade,is_month,learning_goal,split_documents,attachment_context,number_week1,number_week2,number_week3,number_week4,letter_week3,letter_week4,teacher_notes,nee_notes,project_notes,richmond_unit_id,richmond_lesson_group_ids',
  ],
  ['teacher_plan_templates', 'id,template,teacher_id,is_school_official,created_at,plan_type'],
  ['materials', 'id,type,play_token,homework_min_correct,teacher_id'],
  ['game_players', 'id,teacher_id,code,nickname,avatar,student_id'],
  ['game_plays', 'id,player_id,material_id,teacher_id,correct,total,duration_s,passed'],
  ['students', 'id,group_id,first_name_encrypted,last_name_encrypted'],
]
for (const [table, columns] of requirements) {
  const { error } = await db.from(table).select(columns).limit(0)
  report(`${table} schema`, !error, error ? `Database error ${error.code || '(connection)'}` : '')
}
try {
  const response = await fetch(new URL('/rest/v1/', process.env.NEXT_PUBLIC_SUPABASE_URL), {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: 'application/openapi+json',
    },
    signal: AbortSignal.timeout(15000),
  })
  const schema = await response.json()
  report(
    'atomic plan-save RPC exposed (migration 091)',
    response.ok && !!schema.paths?.['/rpc/save_plan_document_if_unchanged']
  )
} catch {
  report('atomic plan-save RPC inspection', false, 'Could not read API schema')
}
if (origin) {
  try {
    const url = new URL(origin)
    report(
      'public sharing origin',
      url.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    )
    const { data, error } = await db
      .from('materials')
      .select('play_token,type')
      .not('play_token', 'is', null)
      .limit(2)
    if (error) report('existing shared-link lookup', false, 'Database lookup failed')
    else if (!data?.length) console.log('SKIP anonymous page checks: no shared material exists')
    else
      for (const material of data) {
        const response = await fetch(new URL(`/jugar/${material.play_token}`, url), {
          signal: AbortSignal.timeout(30000),
        })
        const html = await response.text()
        report(
          `anonymous ${material.type} page`,
          response.status === 200 &&
            !new URL(response.url).pathname.startsWith('/login') &&
            !html.includes('NEXT_HTTP_ERROR_FALLBACK;404')
        )
        // Browser POSTs originate from the canonical page host after any www redirect.
        if (material === data[0]) {
          const canonical = new URL(response.url).origin
          for (const endpoint of ['player', 'result']) {
            const invalid = await fetch(`${canonical}/api/game/not-a-valid-token/${endpoint}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Origin: canonical },
              body: '{}',
              signal: AbortSignal.timeout(15000),
            })
            report(
              `anonymous ${endpoint} API routing`,
              invalid.status === 404,
              `HTTP ${invalid.status}; deliberately invalid token, no records created`
            )
          }
        }
      }
  } catch {
    report('public game page access', false, 'Unable to reach configured origin')
  }
} else report('public sharing origin', false, 'Provide --origin or NEXT_PUBLIC_APP_URL')
console.log(
  'This check does not verify real AI generation, browser result saving, or a deployed commit. Those release checks are required separately.'
)
process.exitCode = failures ? 1 : 0
