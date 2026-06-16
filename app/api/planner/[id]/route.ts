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

    // Fetch lesson plan IDs so we can delete their materials (no FK cascade on materials.lesson_plan_id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: plans } = await (supabase as any)
      .from('lesson_plans')
      .select('id')
      .eq('fortnight_id', params.id)
    const planIds: string[] = (plans ?? []).map((p: { id: string }) => p.id)

    // Delete all materials for this fortnight (by fortnight_id or lesson_plan_id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseDelete = (supabase as any).from('materials').delete().eq('teacher_id', teacher.id)
    if (planIds.length > 0) {
      await baseDelete.or(`fortnight_id.eq.${params.id},lesson_plan_id.in.(${planIds.join(',')})`)
    } else {
      await baseDelete.eq('fortnight_id', params.id)
    }

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
