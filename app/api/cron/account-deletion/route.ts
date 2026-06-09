import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: toDelete, error: fetchError } = await (serviceClient as any)
    .from('teachers')
    .select('id, auth_id')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff)

  if (fetchError) {
    console.error('account-deletion cron fetch failed:', fetchError)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  if (!toDelete || toDelete.length === 0) {
    return NextResponse.json({ deleted: 0 })
  }

  let deleted = 0
  for (const teacher of toDelete) {
    // Deleting the auth user cascades to teachers (ON DELETE CASCADE) and all child rows
    const { error } = await serviceClient.auth.admin.deleteUser(teacher.auth_id)
    if (error) {
      console.error(`Failed to hard-delete teacher ${teacher.id}:`, error)
    } else {
      deleted++
    }
  }

  return NextResponse.json({ deleted })
}
