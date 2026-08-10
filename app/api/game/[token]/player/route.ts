import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { mintPlayerCode } from '@/lib/games/player-code'

// Public: a child opens the teacher's link and creates a nickname-only play profile.
// NO email, NO password, NO real name — we never collect PII from minors (LFPDPPP).
// Service role because the player is anonymous; the profile is scoped to the link's teacher.
const Schema = z.object({
  nickname: z.string().trim().min(1, 'Escribe un apodo').max(24, 'Máximo 24 caracteres'),
  avatar: z.string().trim().min(1).max(8).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await checkRateLimit(`ip:${ip}`, 'strict', 'game-player')
  if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

  if (!/^[a-f0-9]{32}$/.test(params.token)) {
    return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 })
  }

  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: material } = await supabase
    .from('materials')
    .select('teacher_id')
    .eq('play_token', params.token)
    .single()
  if (!material) return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 })

  // Retry on the (astronomically unlikely) code collision rather than failing the child's first tap.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = mintPlayerCode()
    const { data, error } = await supabase
      .from('game_players')
      .insert({
        teacher_id: material.teacher_id,
        nickname: parsed.data.nickname,
        avatar: parsed.data.avatar || '🐣',
        code,
      })
      .select('id, nickname, avatar, code')
      .single()
    if (data) return NextResponse.json(data)
    if (error && !error.message.includes('duplicate')) {
      console.error('[game-player] insert failed:', error)
      return NextResponse.json({ error: 'No pude crear el perfil.' }, { status: 500 })
    }
  }
  return NextResponse.json({ error: 'No pude crear el perfil.' }, { status: 500 })
}
