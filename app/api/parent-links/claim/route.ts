// POST /api/parent-links/claim — an authenticated (parent) user redeems an invite token,
// binding their auth id to the student link. Service role: the row has no owner yet, so RLS
// can't grant this write; the token itself is the credential (same trust model as diary share).
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { checkRateLimit } from '@/lib/rate-limit'
import { canClaim } from '@/lib/parents/links'

const Schema = z.object({ token: z.string().regex(/^[a-f0-9]{32}$/) })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'standard', 'parent-claim')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    const body = Schema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Token inválido' }, { status: 400 })

    const service = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: link } = await (service as any)
      .from('parent_links')
      .select('id, expires_at, claimed_at, revoked_at')
      .eq('invite_token', body.data.token)
      .single()

    if (!link || !canClaim(link))
      return NextResponse.json({ error: 'Invitación inválida o vencida' }, { status: 410 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: claimed, error } = await (service as any)
      .from('parent_links')
      .update({ parent_auth_id: user.id, claimed_at: new Date().toISOString() })
      .eq('id', link.id)
      .is('claimed_at', null) // race guard: first claim wins
      .select('id')
    if (error) {
      console.error('[parent-claim]', error)
      return NextResponse.json({ error: 'No se pudo vincular la cuenta' }, { status: 500 })
    }
    if (!claimed?.length)
      // Someone else claimed between our read and write.
      return NextResponse.json({ error: 'Invitación inválida o vencida' }, { status: 410 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[parent-claim]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
