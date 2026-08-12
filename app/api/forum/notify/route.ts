import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { Resend } from 'resend'
import { checkRateLimit } from '@/lib/rate-limit'

// Best-effort email after a forum message: a new duda notifies the group's teacher; a reply
// notifies the original author (unless they replied to themselves). Fire-and-forget from the UI.
const Schema = z.object({ question_id: z.string().uuid() })

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { success } = await checkRateLimit(user.id, 'standard', 'forum-notify')
    if (!success) return NextResponse.json({ ok: false }, { status: 429 })
    if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: false })

    const service = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: q } = await (service as any)
      .from('group_questions')
      .select('id, group_id, teacher_id, author_auth, author_name, body, reply_to')
      .eq('id', body.data.question_id)
      .maybeSingle()
    // Only the author of the message may trigger its notification (no spoofing).
    if (!q || q.author_auth !== user.id) return NextResponse.json({ ok: false })

    // Recipient: teacher for a new duda; the thread author for a reply.
    let to: string | null = null
    let recipientIsTeacher = false
    if (!q.reply_to) {
      if (q.author_auth !== user.id) return NextResponse.json({ ok: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: teacher } = await (service as any)
        .from('teachers')
        .select('email, auth_id')
        .eq('id', q.teacher_id)
        .maybeSingle()
      // Teacher posting a top-level message to her own forum → nobody to notify.
      if (!teacher?.email || teacher.auth_id === user.id) return NextResponse.json({ ok: false })
      to = teacher.email
      recipientIsTeacher = true
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: parentMsg } = await (service as any)
        .from('group_questions')
        .select('author_auth')
        .eq('id', q.reply_to)
        .maybeSingle()
      if (!parentMsg || parentMsg.author_auth === user.id) return NextResponse.json({ ok: false })
      const { data: target } = await service.auth.admin.getUserById(parentMsg.author_auth)
      to = target?.user?.email ?? null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: t2 } = await (service as any)
        .from('teachers')
        .select('id')
        .eq('auth_id', parentMsg.author_auth)
        .maybeSingle()
      recipientIsTeacher = !!t2
    }
    if (!to) return NextResponse.json({ ok: false })

    const base =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const isReply = !!q.reply_to
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'MaestraIA <notificaciones@maestraia.com>',
      to,
      subject: isReply
        ? `💬 ${q.author_name} respondió tu mensaje`
        : `❓ Nueva duda de ${q.author_name}`,
      html: `<p><strong>${q.author_name}</strong> ${isReply ? 'respondió en el foro del grupo' : 'publicó una duda en el foro del grupo'}:</p>
<blockquote style="border-left:3px solid #ddd;margin:8px 0;padding:4px 12px;color:#444;white-space:pre-line">${q.body.slice(0, 500)}</blockquote>
<p><a href="${base}${recipientIsTeacher ? '/grupos/' + q.group_id : '/familia'}" style="color:#4f46e5">Ver la conversación</a></p>`,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[forum-notify]', err)
    return NextResponse.json({ ok: false })
  }
}
