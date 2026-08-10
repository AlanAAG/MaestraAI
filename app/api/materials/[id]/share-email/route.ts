import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { Resend } from 'resend'
import { checkRateLimit } from '@/lib/rate-limit'
import { decrypt } from '@/lib/encryption'
import { grantsAccess } from '@/lib/parents/links'
import { logAudit } from '@/lib/audit'

// Emails the game's play link to every family with a live parent_link for this teacher.
// Best-effort per address: one bad email must not abort the batch.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const rl = await checkRateLimit(user.id, 'strict', 'share-email')
  if (!rl.success) {
    return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teacher } = await (supabase as any)
    .from('teachers')
    .select('id, full_name, email')
    .eq('auth_id', user.id)
    .single()
  if (!teacher) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: material } = await (supabase as any)
    .from('materials')
    .select('id, type, play_token')
    .eq('id', params.id)
    .eq('teacher_id', teacher.id)
    .single()
  if (!material?.play_token) {
    return NextResponse.json({ error: 'Genera primero el link del juego.' }, { status: 400 })
  }

  const service = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: links } = await (service as any)
    .from('parent_links')
    .select('invite_email_encrypted, expires_at, claimed_at, revoked_at')
    .eq('teacher_id', teacher.id)

  const emails: string[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (links ?? []).filter((x: any) => !x.revoked_at)) {
    // Claimed links have no expiry check; pending ones must still be valid.
    if (!l.claimed_at && !grantsAccess(l)) continue
    try {
      const email = await decrypt(l.invite_email_encrypted)
      if (email && !emails.includes(email)) emails.push(email)
    } catch {
      // undecryptable row → skip that family
    }
  }
  if (!emails.length) {
    return NextResponse.json({ error: 'Aún no hay familias invitadas.' }, { status: 400 })
  }

  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const url = `${base}/jugar/${material.play_token}`
  const resend = new Resend(process.env.RESEND_API_KEY!)

  let sent = 0
  for (const to of emails) {
    try {
      await resend.emails.send({
        from: 'MaestraIA <notificaciones@maestraia.com>',
        to,
        replyTo: teacher.email ?? undefined,
        subject: 'Un juego para practicar en casa 🎲',
        html: `<p>Hola,</p>
<p>${teacher.full_name ?? 'La maestra'} compartió un juego para que su hijo/a practique en casa.</p>
<p><a href="${url}">Abrir el juego</a></p>
<p style="color:#666;font-size:13px">No necesita cuenta: el niño elige un apodo y a jugar.</p>`,
      })
      sent++
    } catch (err) {
      console.error('[share-email] send failed:', err)
    }
  }
  await logAudit({
    teacher_id: teacher.id,
    action: 'material.share_email',
    resource_type: 'material',
    resource_id: material.id,
    req,
  })
  return NextResponse.json({ sent, total: emails.length })
}
