import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { normalizePlayerCode, PLAYER_CODE_RE } from '@/lib/games/player-code'

const Schema = z.object({ code: z.string().min(4).max(16), student_id: z.string().uuid() })

// A teacher can associate an anonymous game profile with a roster student using the child's code.
// Children and families never need to sign in for homework tracking.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { success } = await checkRateLimit(user.id, 'strict', 'teacher-player-code')
  if (!success)
    return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 })
  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const code = normalizePlayerCode(parsed.data.code)
  if (!PLAYER_CODE_RE.test(code))
    return NextResponse.json({ error: 'El código debe tener 6 caracteres.' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: teacher } = await db.from('teachers').select('id').eq('auth_id', user.id).single()
  if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: material } = await db
    .from('materials')
    .select('id')
    .eq('id', params.id)
    .eq('teacher_id', teacher.id)
    .single()
  if (!material) return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 })

  const { data: student } = await db
    .from('students')
    .select('id, group_id')
    .eq('id', parsed.data.student_id)
    .single()
  if (!student) return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })
  const [{ data: assigned }, { data: titular }] = await Promise.all([
    db
      .from('group_teachers')
      .select('group_id')
      .eq('group_id', student.group_id)
      .eq('teacher_id', teacher.id)
      .maybeSingle(),
    db
      .from('groups')
      .select('id')
      .eq('id', student.group_id)
      .eq('titular_teacher_id', teacher.id)
      .is('archived_at', null)
      .maybeSingle(),
  ])
  if (!assigned && !titular)
    return NextResponse.json({ error: 'Alumno fuera de tus grupos' }, { status: 403 })

  const { data: player } = await db
    .from('game_players')
    .select('id, student_id')
    .eq('teacher_id', teacher.id)
    .eq('code', code)
    .maybeSingle()
  if (!player)
    return NextResponse.json({ error: 'No encontré ese código de jugador.' }, { status: 404 })
  if (player.student_id && player.student_id !== student.id) {
    return NextResponse.json(
      { error: 'Este código ya está vinculado con otro alumno.' },
      { status: 409 }
    )
  }
  const { error } = await db
    .from('game_players')
    .update({ student_id: student.id })
    .eq('id', player.id)
    .eq('teacher_id', teacher.id)
  if (error) {
    console.error('[teacher-player-code] link failed:', error)
    return NextResponse.json({ error: 'No se pudo vincular el jugador.' }, { status: 500 })
  }
  return NextResponse.json({ linked: true })
}
