import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Who played this game at home, and how many aciertos. Teacher-only, RLS-scoped.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('game_plays')
      .select('correct, total, passed, created_at, game_players(nickname, avatar)')
      .eq('material_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return NextResponse.json({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      plays: (data ?? []).map((p: any) => ({
        nickname: p.game_players?.nickname ?? 'Alguien',
        avatar: p.game_players?.avatar ?? '🐣',
        correct: p.correct,
        total: p.total,
        passed: p.passed,
        created_at: p.created_at,
      })),
    })
  } catch {
    // migration 069 not applied yet → nothing to show, never an error screen
    return NextResponse.json({ plays: [] })
  }
}
