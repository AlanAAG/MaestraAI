import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

const Schema = z.object({
  fortnight_id: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { success, headers } = await checkRateLimit(user.id, 'standard')
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

  const { fortnight_id } = parsed.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const teacherId = (teacher as any).id as string

  // Verify ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: fortnight } = await (supabase as any)
    .from('fortnights')
    .select('id')
    .eq('id', fortnight_id)
    .eq('teacher_id', teacherId)
    .single()
  if (!fortnight) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Return most recent existing pack if any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('fortnight_packs')
    .select('id, status, progress')
    .eq('fortnight_id', fortnight_id)
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pack_id: (existing as any).id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: (existing as any).status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      progress: (existing as any).progress ?? {},
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pack, error } = await (supabase as any)
    .from('fortnight_packs')
    .insert({
      teacher_id: teacherId,
      fortnight_id,
      status: 'generating',
      progress: {},
    })
    .select('id')
    .single()

  if (error || !pack) {
    return NextResponse.json({ error: 'Error al crear el pack' }, { status: 500 })
  }

  return NextResponse.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pack_id: (pack as any).id,
    status: 'generating',
    progress: {},
  })
}
