import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptName } from '@/lib/students/name'

type Student = {
  id: string
  first_name_encrypted: string
  last_name_encrypted: string
  groups: { name: string; archived_at: string | null } | null
}
type Player = { id: string; nickname: string; avatar: string; student_id: string | null }
type Play = { player_id: string; correct: number; total: number; created_at: string }

// Teacher's roster and each linked child's best result for this material.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: teacher } = await db.from('teachers').select('id').eq('auth_id', user.id).single()
  if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data: material } = await db
    .from('materials')
    .select('id, fortnight_id, homework_min_correct')
    .eq('id', params.id)
    .eq('teacher_id', teacher.id)
    .single()
  if (!material) return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 })

  try {
    const [{ data: assigned }, { data: titular }] = await Promise.all([
      db.from('group_teachers').select('group_id').eq('teacher_id', teacher.id),
      db.from('groups').select('id').eq('titular_teacher_id', teacher.id).is('archived_at', null),
    ])
    const groupIds: string[] = Array.from(
      new Set<string>([
        ...(assigned ?? []).map((g: { group_id: string }) => g.group_id),
        ...(titular ?? []).map((g: { id: string }) => g.id),
      ])
    )
    if (material.fortnight_id) {
      const { data: fortnight } = await db
        .from('fortnights')
        .select('group_id')
        .eq('id', material.fortnight_id)
        .single()
      if (fortnight?.group_id) {
        const index = groupIds.indexOf(fortnight.group_id)
        if (index < 0) groupIds.length = 0
        else groupIds.splice(0, groupIds.length, fortnight.group_id)
      }
    }
    if (!groupIds.length) return NextResponse.json({ rows: [] })

    const { data: rawStudents, error: studentError } = await db
      .from('students')
      .select('id, first_name_encrypted, last_name_encrypted, groups(name, archived_at)')
      .in('group_id', groupIds)
    if (studentError) throw studentError
    const students: Student[] = (rawStudents ?? []).filter((s: Student) => !s.groups?.archived_at)
    const { data: rawPlayers, error: playerError } = await db
      .from('game_players')
      .select('id, nickname, avatar, student_id')
      .eq('teacher_id', teacher.id)
      .not('student_id', 'is', null)
    if (playerError) throw playerError
    const players: Player[] = rawPlayers ?? []
    const playerIds = players.map((p) => p.id)
    let plays: Play[] = []
    if (playerIds.length) {
      const { data, error } = await db
        .from('game_plays')
        .select('player_id, correct, total, created_at')
        .eq('material_id', material.id)
        .in('player_id', playerIds)
      if (error) throw error
      plays = data ?? []
    }

    const rows = await Promise.all(
      students.map(async (student) => {
        const linked = players.filter((p) => p.student_id === student.id)
        const linkedIds = new Set(linked.map((p) => p.id))
        const studentPlays = plays.filter((p) => linkedIds.has(p.player_id))
        const best = studentPlays.sort(
          (a, b) => b.correct - a.correct || b.created_at.localeCompare(a.created_at)
        )[0]
        const name = await decryptName(student)
        return {
          student_id: student.id,
          student_name: name.name,
          group_name: student.groups?.name ?? null,
          linked: linked.length > 0,
          nickname: linked[0]?.nickname ?? null,
          avatar: linked[0]?.avatar ?? null,
          played: !!best,
          correct: best?.correct ?? null,
          total: best?.total ?? null,
          passed:
            best && material.homework_min_correct != null
              ? studentPlays.some((p) => p.correct >= material.homework_min_correct)
              : null,
          last_played: best?.created_at ?? null,
        }
      })
    )
    rows.sort((a, b) => a.student_name.localeCompare(b.student_name, 'es'))
    return NextResponse.json({ rows })
  } catch (error) {
    console.error('[material-players] load failed:', error)
    return NextResponse.json({ error: 'No se pudo cargar el seguimiento' }, { status: 500 })
  }
}
