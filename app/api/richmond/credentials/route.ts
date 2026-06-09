import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'

// DELETE /api/richmond/credentials
// Clears all stored Richmond credentials for the authenticated teacher.
// Covers LFPDPPP right of cancellation for Richmond-specific data.
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher, error: teacherError } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()

  if (teacherError || !teacher) {
    return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherId = (teacher as any).id as string

  // Clear email/password stored on teachers table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: teacherUpdateError } = await (supabase as any)
    .from('teachers')
    .update({
      richmond_email_encrypted: null,
      richmond_password_encrypted: null,
    })
    .eq('id', teacherId)

  if (teacherUpdateError) {
    return NextResponse.json({ error: 'Failed to clear credentials' }, { status: 500 })
  }

  // Mark all session credentials as revoked (keep rows for audit trail)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('richmond_credentials')
    .update({
      is_valid: false,
      revoked_at: new Date().toISOString(),
    })
    .eq('teacher_id', teacherId)
    .is('revoked_at', null)

  await logAudit({
    teacher_id: teacherId,
    action: AUDIT_ACTIONS.RICHMOND_CREDENTIALS_REVOKE,
    resource_type: 'richmond_credentials',
    resource_id: teacherId,
    req,
  })

  return NextResponse.json({ success: true })
}
