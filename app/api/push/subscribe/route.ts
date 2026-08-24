import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit } from '@/lib/rate-limit'
import { isAllowedPushEndpoint } from '@/lib/push/allowlist'

// A person realistically has a handful of devices; the cap keeps a hostile account from
// stockpiling endpoints (amplifying our outbound sends). Oldest rows rotate out.
const MAX_SUBSCRIPTIONS_PER_USER = 8

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

    // SSRF guard: we will POST to this URL — only real browser push services are accepted.
    if (!isAllowedPushEndpoint(body.data.endpoint))
      return NextResponse.json({ error: 'Endpoint no permitido' }, { status: 422 })

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

    // Rotate out the oldest rows beyond the per-user cap (user-scoped: RLS owner-only).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: mine } = await (supabase as any)
      .from('push_subscriptions')
      .select('id')
      .eq('auth_id', user.id)
      .order('created_at', { ascending: false })
    if ((mine?.length ?? 0) > MAX_SUBSCRIPTIONS_PER_USER) {
      const excess = mine.slice(MAX_SUBSCRIPTIONS_PER_USER).map((r: { id: string }) => r.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('push_subscriptions').delete().in('id', excess)
    }
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
