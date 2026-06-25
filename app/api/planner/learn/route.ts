import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { refreshLearnedProfile } from '@/lib/planner/learning'

// On-demand: "Aprender de mis planeaciones" — force-refresh the teacher's distilled style profile
// from her accumulated edited plans + corrections (both plan types).
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success } = await checkRateLimit(user.id, 'strict')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    const teacherId = (teacher as { id: string }).id
    const [q, t] = await Promise.all([
      refreshLearnedProfile(supabase, teacherId, 'quincena'),
      refreshLearnedProfile(supabase, teacherId, 'taller'),
    ])
    return NextResponse.json({
      ok: true,
      source_count: (q?.source_count ?? 0) + (t?.source_count ?? 0),
    })
  } catch (e) {
    console.error('[planner/learn]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
