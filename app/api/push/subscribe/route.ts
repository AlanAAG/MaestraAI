import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit } from '@/lib/rate-limit'

// Save/remove the caller's own web-push subscription. User-scoped: RLS (084) owner policy.

const SubscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(300),
    auth: z.string().min(1).max(100),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'standard')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    const body = SubscribeSchema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

    // Same browser can change accounts: clear any previous owner of this exact endpoint
    // (unguessable, provided by the browser itself), then insert under the caller.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (createServiceClient() as any)
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', body.data.endpoint)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('push_subscriptions').insert({
      auth_id: user.id,
      endpoint: body.data.endpoint,
      p256dh: body.data.keys.p256dh,
      auth: body.data.keys.auth,
    })
    if (error)
      return NextResponse.json({ error: 'No pude guardar la suscripción.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/push/subscribe error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = z
      .object({ endpoint: z.string().url().max(1000) })
      .safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('push_subscriptions').delete().eq('endpoint', body.data.endpoint)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // best-effort cleanup
  }
}
