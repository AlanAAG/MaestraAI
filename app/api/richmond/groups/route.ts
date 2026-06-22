// app/api/richmond/groups/route.ts
// Returns teacher's groups with Richmond slugs for Chrome extension auto-discovery

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyApiKey, extractKeyPrefix } from '@/lib/api-keys'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  // Auth: Validate API key
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
  }

  // Get API key from database by prefix
  const keyPrefix = extractKeyPrefix(token)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: apiKey, error: keyError } = await (supabase as any)
    .from('api_keys')
    .select('teacher_id, key_hash')
    .eq('key_prefix', keyPrefix)
    .is('revoked_at', null)
    .single()

  if (keyError || !apiKey) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  // Verify API key hash
  const isValid = await verifyApiKey(token, apiKey.key_hash)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  // Update last_used_at timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('key_prefix', keyPrefix)

  // Rate limiting - relaxed tier (100/hour for read-only operations)
  const { success, headers } = await checkRateLimit(apiKey.teacher_id, 'relaxed')
  if (!success) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Por favor intenta de nuevo más tarde.' },
      { status: 429, headers }
    )
  }

  // Get teacher info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher, error: teacherError } = await (supabase as any)
    .from('teachers')
    .select('id, full_name')
    .eq('id', apiKey.teacher_id)
    .single()

  if (teacherError || !teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  // Get teacher's groups with Richmond slugs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: groups, error: groupsError } = await (supabase as any)
    .from('groups')
    .select('id, name, richmond_class_code')
    .eq('titular_teacher_id', apiKey.teacher_id)
    .order('name')

  if (groupsError) {
    console.error('Failed to fetch groups:', groupsError)
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 })
  }

  // Build groupMap: { 'grupo-aca6e': 'uuid1', 'grupo-b01f6': 'uuid2' }
  const groupMap: Record<string, string> = {}
  const groupNames: string[] = []
  const unmappedGroups: Array<{ id: string; name: string }> = []

  for (const group of groups || []) {
    if (group.richmond_class_code) {
      groupMap[group.richmond_class_code] = group.id
    } else {
      unmappedGroups.push({ id: group.id, name: group.name })
    }
    groupNames.push(group.name)
  }

  return NextResponse.json({
    groupMap,
    teacherName: teacher.full_name,
    groups: groupNames,
    totalGroups: groups?.length || 0,
    mappedGroups: Object.keys(groupMap).length,
    unmappedGroups,
  })
}
