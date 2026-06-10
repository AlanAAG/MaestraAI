import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifyApiKey, extractKeyPrefix } from '@/lib/api-keys'

const Schema = z.object({
  uuid: z.string().uuid(),
  title: z.string().max(200).nullable().optional(),
  content: z.record(z.string(), z.unknown()),
})

export async function POST(req: NextRequest) {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Bearer token auth (same pattern as /api/richmond/ingest)
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
  }

  const prefix = extractKeyPrefix(token)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: apiKey, error: keyError } = await (supabase as any)
    .from('api_keys')
    .select('id, teacher_id, key_hash, revoked_at')
    .eq('key_prefix', prefix)
    .maybeSingle()

  if (keyError || !apiKey || apiKey.revoked_at) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  const isValid = await verifyApiKey(token, apiKey.key_hash)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { uuid, title, content } = parsed.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('richmond_interactive_content').upsert(
    {
      interactive_uuid: uuid,
      teacher_id: apiKey.teacher_id,
      title: title ?? null,
      content_raw: content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'interactive_uuid' }
  )

  if (error) {
    console.error('ebook-content upsert error:', error)
    return NextResponse.json({ error: 'Failed to store content' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, uuid })
}
