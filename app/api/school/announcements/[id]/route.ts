import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id, role_type')
      .eq('auth_id', user.id)
      .single()

    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: announcement } = await (supabase as any)
      .from('school_announcements')
      .select('id, author_teacher_id')
      .eq('id', params.id)
      .single()

    if (!announcement) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = announcement.author_teacher_id === teacher.id
    const isAdmin = teacher.role_type === 'admin'
    if (!isOwner && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('school_announcements')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    await logAudit({
      teacher_id: teacher.id,
      action: AUDIT_ACTIONS.ANNOUNCEMENT_DELETE,
      resource_type: 'announcement',
      resource_id: params.id,
      req,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE announcement error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
