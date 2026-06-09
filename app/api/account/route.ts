import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (!teacher) {
    return NextResponse.json({ error: 'Perfil de maestra no encontrado' }, { status: 404 })
  }

  // Soft-delete: mark account for deletion (hard delete runs after 30 days via cron)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: softDeleteError } = await (supabase as any)
    .from('teachers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', teacher.id)

  if (softDeleteError) {
    console.error('Failed to soft-delete teacher:', softDeleteError)
    return NextResponse.json({ error: 'Error al eliminar la cuenta' }, { status: 500 })
  }

  // Revoke all API keys
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('teacher_id', teacher.id)
    .is('revoked_at', null)

  // Revoke all Richmond credentials
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('richmond_credentials')
    .update({ revoked_at: new Date().toISOString() })
    .eq('teacher_id', teacher.id)
    .is('revoked_at', null)

  await logAudit({
    teacher_id: teacher.id,
    action: AUDIT_ACTIONS.ACCOUNT_DELETE,
    resource_type: 'teacher',
    resource_id: teacher.id,
    metadata: { email: user.email },
    req,
  })

  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}

// Called by cron job: hard-delete accounts soft-deleted more than 30 days ago
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: toDelete } = await (serviceClient as any)
    .from('teachers')
    .select('id, auth_id')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff)

  if (!toDelete || toDelete.length === 0) {
    return NextResponse.json({ deleted: 0 })
  }

  let deleted = 0
  for (const teacher of toDelete) {
    const { error } = await serviceClient.auth.admin.deleteUser(teacher.auth_id)
    if (!error) deleted++
  }

  return NextResponse.json({ deleted })
}
