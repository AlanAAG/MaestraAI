// app/api/keys/route.ts
// API key management: list, generate, and revoke per-teacher API keys

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateApiKey, hashApiKey, extractKeyPrefix } from '@/lib/api-keys'

const CreateKeySchema = z.object({
  name: z.string().min(1).max(100),
})

const DeleteKeySchema = z.object({
  id: z.string().uuid(),
})

// GET /api/keys - List teacher's API keys
export async function GET() {
  const supabase = createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get teacher record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher, error: teacherError } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (teacherError || !teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  // Get API keys (exclude key_hash for security)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: keys, error: keysError } = await (supabase as any)
    .from('api_keys')
    .select('id, name, key_prefix, created_at, last_used_at, revoked_at')
    .eq('teacher_id', teacher.id)
    .order('created_at', { ascending: false })

  if (keysError) {
    console.error('Failed to fetch API keys:', keysError)
    return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })
  }

  return NextResponse.json({ keys: keys || [] })
}

// POST /api/keys - Generate new API key
export async function POST(req: NextRequest) {
  const supabase = createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Get teacher record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher, error: teacherError } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (teacherError || !teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  // Generate new API key
  const key = generateApiKey()
  const keyHash = await hashApiKey(key)
  const keyPrefix = extractKeyPrefix(key)

  // Store in database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newKey, error: insertError } = await (supabase as any)
    .from('api_keys')
    .insert({
      teacher_id: teacher.id,
      name: parsed.data.name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
    })
    .select('id, name, key_prefix, created_at')
    .single()

  if (insertError) {
    console.error('Failed to create API key:', insertError)
    return NextResponse.json({ error: 'Failed to create key' }, { status: 500 })
  }

  // Return plaintext key ONCE - will never be shown again
  return NextResponse.json({
    key, // Full plaintext key (53 chars)
    ...newKey,
  })
}

// DELETE /api/keys - Revoke API key (soft delete)
export async function DELETE(req: NextRequest) {
  const supabase = createClient()

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse request body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = DeleteKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  // Get teacher record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher, error: teacherError } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (teacherError || !teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  // Soft delete via revoked_at timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: revokeError } = await (supabase as any)
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', parsed.data.id)
    .eq('teacher_id', teacher.id) // Ensure ownership

  if (revokeError) {
    console.error('Failed to revoke API key:', revokeError)
    return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
