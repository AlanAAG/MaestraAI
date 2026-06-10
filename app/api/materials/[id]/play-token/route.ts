import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
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
    return NextResponse.json({ play_token: token, play_url: buildUrl(token) })
  }

  // Generate short, URL-safe token
  const token = Math.random().toString(36).slice(2, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('materials').update({ play_token: token }).eq('id', params.id)

  return NextResponse.json({ play_token: token, play_url: buildUrl(token) })
}

function buildUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return `${base}/jugar/${token}`
}
