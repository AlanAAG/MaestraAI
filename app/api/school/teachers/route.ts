import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: requester } = await (supabase as any)
      .from('teachers')
      .select('id, role_type, school_id')
      .eq('auth_id', user.id)
      .single()

    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (requester.role_type !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden — solo admins pueden ver el equipo' },
        { status: 403 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('teachers')
      .select('id, full_name, email, role_type, subject, created_at')
      .eq('school_id', requester.school_id)
      .is('deleted_at', null)
      .order('full_name')

    if (error) throw error
    return NextResponse.json({ teachers: data || [] })
  } catch (err) {
    console.error('GET school/teachers error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
