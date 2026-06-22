// PATCH /api/richmond/groups/map
// Called by the Chrome extension to link a Richmond course slug to a MaestraAI group.
// Eliminates the manual "Código de clase Richmond" copy-paste from the teacher flow.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyApiKey, extractKeyPrefix } from '@/lib/api-keys'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const BodySchema = z.object({
  group_id: z.string().uuid(),
  richmond_slug: z.string().min(1).max(120),
})

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Missing API key' }, { status: 401 })

  const keyPrefix = extractKeyPrefix(token)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: apiKey, error: keyError } = await (supabase as any)
    .from('api_keys')
    .select('teacher_id, key_hash')
    .eq('key_prefix', keyPrefix)
    .is('revoked_at', null)
    .single()

  if (keyError || !apiKey) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  if (!(await verifyApiKey(token, apiKey.key_hash)))
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })

  const { success, headers } = await checkRateLimit(apiKey.teacher_id, 'standard')
  if (!success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers })

  const body = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!body.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const { group_id, richmond_slug } = body.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('groups')
    .update({ richmond_class_code: richmond_slug })
    .eq('id', group_id)
    .eq('titular_teacher_id', apiKey.teacher_id) // prevents cross-tenant writes

  if (error) {
    console.error('Failed to map group:', error)
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
