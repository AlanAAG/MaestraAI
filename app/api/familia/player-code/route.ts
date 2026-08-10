import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'
import { grantsAccess } from '@/lib/parents/links'
import { normalizePlayerCode, PLAYER_CODE_RE } from '@/lib/games/player-code'

// A parent links their child's anonymous play profile (by the 6-char code the child reads out)
// to the student they already have a claimed parent_link for. Only then do aciertos become
// visible to that parent.
const Schema = z.object({
  code: z.string().min(4).max(16),
  student_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { success } = await checkRateLimit(`user:${user.id}`, 'strict', 'player-code')
  if (!success) return NextResponse.json({ error: 'Demasiados intentos.' }, { status: 429 })

  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const code = normalizePlayerCode(parsed.data.code)
  if (!PLAYER_CODE_RE.test(code)) {
    return NextResponse.json({ error: 'El código son 6 letras o números.' }, { status: 400 })
  }

  // The parent must hold a live link to this student (RLS-scoped read).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: link } = await (supabase as any)
    .from('parent_links')
    .select('student_id, teacher_id, expires_at, claimed_at, revoked_at')
    .eq('parent_auth_id', user.id)
    .eq('student_id', parsed.data.student_id)
    .maybeSingle()
  if (!link || !grantsAccess(link)) {
    return NextResponse.json({ error: 'No tienes acceso a ese alumno.' }, { status: 403 })
  }

  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: player } = await (service as any)
    .from('game_players')
    .select('id, teacher_id, student_id, nickname')
    .eq('code', code)
    .maybeSingle()
  if (!player) return NextResponse.json({ error: 'No encontré ese código.' }, { status: 404 })
  // The profile has to come from the same teacher that invited this parent.
  if (player.teacher_id !== link.teacher_id) {
    return NextResponse.json({ error: 'Ese código no es de este grupo.' }, { status: 403 })
  }
  if (player.student_id && player.student_id !== parsed.data.student_id) {
    return NextResponse.json({ error: 'Ese perfil ya está ligado a otro alumno.' }, { status: 409 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (service as any)
    .from('game_players')
    .update({ student_id: parsed.data.student_id })
    .eq('id', player.id)
  if (error) {
    console.error('[player-code] link failed:', error)
    return NextResponse.json({ error: 'No pude ligar el perfil.' }, { status: 500 })
  }

  return NextResponse.json({ linked: true, nickname: player.nickname })
}
