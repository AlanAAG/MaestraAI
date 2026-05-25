// app/api/richmond/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { syncGroup } from '@/lib/richmond/sync'

const SyncInputSchema = z.object({
  group_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const supabase = createClient()

  // Check auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get teacher
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (teacherError || !teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherId = (teacher as any).id as string

  // Parse input
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = SyncInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { group_id } = parsed.data

  // Verify teacher owns this group
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id')
    .eq('id', group_id)
    .eq('titular_teacher_id', teacherId)
    .single()

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found or access denied' }, { status: 403 })
  }

  // Run sync
  const result = await syncGroup(group_id, teacherId, supabase)

  if (result.status === 'session_expired') {
    return NextResponse.json(
      { error: 'session_expired', message: 'Richmond session expired. Please re-login.' },
      { status: 401 }
    )
  }

  if (result.status === 'error') {
    return NextResponse.json(
      {
        error: 'sync_failed',
        message: result.errors[0] ?? 'Unknown error',
        details: result.errors,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    synced: result.synced,
    errors: result.errors,
  })
}
