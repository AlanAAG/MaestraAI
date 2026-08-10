import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'

// Public: stores one finished run (aciertos) for an anonymous play profile.
// The profile must belong to the same teacher as the game — a token from another teacher
// can't write into this teacher's results.
const Schema = z.object({
  player_id: z.string().uuid(),
  correct: z.number().int().min(0).max(500),
  total: z.number().int().min(0).max(500),
  duration_s: z.number().int().min(0).max(7200).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await checkRateLimit(`ip:${ip}`, 'relaxed', 'game-result')
  if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  if (!/^[a-f0-9]{32}$/.test(params.token)) {
    return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 })
  }
  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const { player_id, correct, total, duration_s } = parsed.data

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: material } = await supabase
    .from('materials')
    .select('id, teacher_id, homework_min_correct')
    .eq('play_token', params.token)
    .single()
  if (!material) return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 })

  const { data: player } = await supabase
    .from('game_players')
    .select('id, teacher_id')
    .eq('id', player_id)
    .single()
  if (!player || player.teacher_id !== material.teacher_id) {
    return NextResponse.json({ error: 'Perfil no válido para este juego' }, { status: 403 })
  }

  const min = material.homework_min_correct as number | null
  const passed = min == null ? null : correct >= min
  const { error } = await supabase.from('game_plays').insert({
    player_id,
    material_id: material.id,
    teacher_id: material.teacher_id,
    correct,
    total,
    duration_s: duration_s ?? null,
    passed,
  })
  if (error) {
    console.error('[game-result] insert failed:', error)
    return NextResponse.json({ error: 'No pude guardar el resultado.' }, { status: 500 })
  }
  await supabase
    .from('game_players')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', player_id)

  return NextResponse.json({ saved: true, passed, min_correct: min })
}
