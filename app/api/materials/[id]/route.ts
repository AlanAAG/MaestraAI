import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

const PatchSchema = z.object({ shared_with_parents: z.boolean() })

// PATCH — toggle family sharing. Sharing ON mints a play_token if the material has none
// (the /familia area links straight to /jugar/[token]).
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = await checkRateLimit(user.id, 'standard', 'materials-share')
    if (!rl.success)
      return NextResponse.json(
        { error: 'Demasiadas solicitudes.' },
        { status: 429, headers: rl.headers }
      )

    const body = PatchSchema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: material } = await (supabase as any)
      .from('materials')
      .select('id, play_token')
      .eq('id', params.id)
      .eq('teacher_id', teacher.id)
      .single()
    if (!material) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates: Record<string, unknown> = { shared_with_parents: body.data.shared_with_parents }
    if (body.data.shared_with_parents && !material.play_token) {
      updates.play_token = crypto.randomUUID().replace(/-/g, '')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('materials')
      .update(updates)
      .eq('id', params.id)
      .eq('teacher_id', teacher.id)
    if (error) throw error

    return NextResponse.json({ ok: true, shared_with_parents: body.data.shared_with_parents })
  } catch (err) {
    console.error('PATCH material error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = await checkRateLimit(user.id, 'standard', 'materials-delete')
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
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('materials')
      .delete()
      .eq('id', params.id)
      .eq('teacher_id', teacher.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE material error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
