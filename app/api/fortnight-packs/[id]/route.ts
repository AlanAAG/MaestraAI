import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

const PatchSchema = z.object({
  status: z.enum(['pending', 'generating', 'ready', 'error']).optional(),
  progress: z
    .object({
      plans_done: z.boolean().optional(),
      days_complete: z.array(z.number()).optional(),
      days_failed: z.array(z.number()).optional(),
    })
    .optional(),
  materials_state: z.record(z.string(), z.enum(['done', 'failed', 'pending'])).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // relaxed: this GET is polled by FortnightPackProgress during generation.
  const rl = await checkRateLimit(user.id, 'relaxed', 'fortnight-packs')
  if (!rl.success)
    return NextResponse.json(
      { error: 'Demasiadas solicitudes.' },
      { status: 429, headers: rl.headers }
    )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!teacher) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pack } = await (supabase as any)
    .from('fortnight_packs')
    .select('id, status, progress, material_ids, created_at')
    .eq('id', id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq('teacher_id', (teacher as any).id)
    .single()

  if (!pack) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  return NextResponse.json(pack)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const rl = await checkRateLimit(user.id, 'standard', 'fortnight-packs')
  if (!rl.success)
    return NextResponse.json(
      { error: 'Demasiadas solicitudes.' },
      { status: 429, headers: rl.headers }
    )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id')
    .eq('auth_id', user.id)
    .single()
  if (!teacher) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.data.status !== undefined) updates.status = parsed.data.status
  if (parsed.data.progress !== undefined) updates.progress = parsed.data.progress
  if (parsed.data.materials_state !== undefined)
    updates.materials_state = parsed.data.materials_state

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('fortnight_packs')
    .update(updates)
    .eq('id', id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .eq('teacher_id', (teacher as any).id)

  if (error) return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
