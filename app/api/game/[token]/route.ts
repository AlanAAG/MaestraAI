import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

// Public endpoint — no auth required. Uses service-role to bypass RLS.
// Returns only game content — no teacher_id, no PII.
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { success } = await checkRateLimit(`ip:${ip}`, 'relaxed')
  if (!success) {
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
  }

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: material, error } = await supabase
    .from('materials')
    .select('type, content, vocabulary')
    .eq('play_token', params.token)
    .single()

  if (error || !material) {
    return NextResponse.json({ error: 'Juego no encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    type: material.type,
    content: material.content,
    vocabulary: material.vocabulary,
  })
}
