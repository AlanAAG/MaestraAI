import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/materials/[id]/players
// Returns all students in the teacher's groups with their best play for this material.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: materialId } = await params
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

    // Verify teacher owns this material
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: material } = await (supabase as any)
      .from('materials')
      .select('id, title, game_type')
      .eq('id', materialId)
      .eq('teacher_id', teacher.id)
      .single()
    if (!material) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // All students for this teacher
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: students } = await (supabase as any)
      .from('students')
      .select('id, full_name, groups(id, name)')
      .eq('teacher_id', teacher.id)
      .order('full_name')

    // game_players claimed by parent (student_id set) for this teacher
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: players } = await (supabase as any)
      .from('game_players')
      .select('id, nickname, avatar, student_id')
      .eq('teacher_id', teacher.id)
      .not('student_id', 'is', null)

    // All plays for this material by those players
    const playerIds = (players ?? []).map((p: { id: string }) => p.id)
    let plays: {
      player_id: string
      correct: number
      total: number
      passed: boolean | null
      created_at: string
    }[] = []
    if (playerIds.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rawPlays } = await (supabase as any)
        .from('game_plays')
        .select('player_id, correct, total, passed, created_at')
        .eq('material_id', materialId)
        .in('player_id', playerIds)
        .order('correct', { ascending: false })
      plays = rawPlays ?? []
    }

    // Best play per player (highest correct)
    const bestByPlayer = new Map<string, (typeof plays)[0]>()
    for (const play of plays) {
      const existing = bestByPlayer.get(play.player_id)
      if (!existing || play.correct > existing.correct) bestByPlayer.set(play.player_id, play)
    }

    // player_id → player info
    const playerByStudent = new Map<string, (typeof players)[0]>()
    for (const p of players ?? []) {
      if (p.student_id) playerByStudent.set(p.student_id, p)
    }

    const rows = (students ?? []).map(
      (s: { id: string; full_name: string; groups: { id: string; name: string } | null }) => {
        const player = playerByStudent.get(s.id)
        const best = player ? bestByPlayer.get(player.id) : undefined
        return {
          student_id: s.id,
          student_name: s.full_name,
          group_name: s.groups?.name ?? null,
          // undefined = no parent linked yet
          linked: !!player,
          nickname: player?.nickname ?? null,
          avatar: player?.avatar ?? null,
          played: !!best,
          correct: best?.correct ?? null,
          total: best?.total ?? null,
          passed: best?.passed ?? null,
          last_played: best?.created_at ?? null,
        }
      }
    )

    return NextResponse.json({ material, rows })
  } catch (err) {
    console.error('GET material players error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
