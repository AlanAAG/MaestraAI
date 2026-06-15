import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: fortnight } = await (supabase as any)
      .from('fortnights')
      .select('id')
      .eq('id', params.id)
      .eq('teacher_id', teacher.id)
      .single()
    if (!fortnight) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Delete materials that belong to this fortnight's lesson plans (no FK cascade)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('materials')
      .delete()
      .eq('fortnight_id', params.id)
      .eq('teacher_id', teacher.id)

    // Delete fortnight — lesson_plans cascade automatically
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('fortnights')
      .delete()
      .eq('id', params.id)
      .eq('teacher_id', teacher.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE fortnight error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
