import { gameShareUrl } from '@/lib/games/share-url'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { success, headers } = await checkRateLimit(user.id, 'relaxed')
  if (!success) {
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!teacher) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: material } = await (supabase as any)
    .from('materials')
    .select('id, play_token, type')
    .eq('id', params.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq('teacher_id', (teacher as any).id)
    .single()

  if (!material) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((material as any).play_token) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = (material as any).play_token as string
    return NextResponse.json({
      play_token: token,
      play_url: gameShareUrl(req.nextUrl.origin, token),
    })
  }

  // Cryptographically-random, URL-safe token (public /jugar/[token] must not be guessable).
  const token = crypto.randomUUID().replace(/-/g, '')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (supabase as any)
    .from('materials')
    .update({ play_token: token })
    .eq('id', params.id)
    .eq('teacher_id', teacher.id)
    .is('play_token', null)
    .select('play_token')
    .maybeSingle()
  if (error) {
    return NextResponse.json({ error: 'No se pudo crear el enlace.' }, { status: 500 })
  }
  // Another share click may have won the race. Always return its persistent token.
  const shared =
    updated ??
    (
      await supabase
        .from('materials')
        .select('play_token')
        .eq('id', params.id)
        .eq('teacher_id', teacher.id)
        .single()
    ).data
  if (!shared?.play_token)
    return NextResponse.json({ error: 'No se pudo crear el enlace.' }, { status: 500 })

  return NextResponse.json({
    play_token: shared.play_token,
    play_url: gameShareUrl(req.nextUrl.origin, shared.play_token),
  })
}
