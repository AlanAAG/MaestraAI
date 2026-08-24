import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { checkRateLimit } from '@/lib/rate-limit'
import { createServiceClient } from '@/lib/supabase/service'
import { escapeHtml, escapeLike } from '@/lib/html'

// School allowlist: directors (role_type admin) invite teacher/admin emails. Only those emails
// can join the school; the claim happens automatically at signup/onboarding (see claim route).

const PostSchema = z.object({
  email: z.string().email().max(200),
  role: z.enum(['teacher', 'admin', 'coordinator']).default('teacher'),
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function adminSchool(supabase: any, userId: string) {
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, school_id, role_type, full_name, email, schools(name, slug)')
    .eq('auth_id', userId)
    .single()
  if (!teacher || teacher.role_type !== 'admin' || !teacher.school_id) return null
  return teacher
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const admin = await adminSchool(supabase, user.id)
  if (!admin) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('school_invites')
    .select('id, email, role, claimed_at, created_at')
    .eq('school_id', admin.school_id)
    .order('created_at', { ascending: false })
  return NextResponse.json({ invites: data ?? [], school: admin.schools })
}

export async function POST(req: NextRequest) {
  try {
    const body = PostSchema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Correo inválido' }, { status: 400 })
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { success } = await checkRateLimit(user.id, 'standard', 'school-invites')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
    const admin = await adminSchool(supabase, user.id)
    if (!admin) return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })

    const email = body.data.email.trim().toLowerCase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('school_invites').insert({
      school_id: admin.school_id,
      email,
      role: body.data.role,
      invited_by: admin.id,
    })
    if (error) {
      if (String(error.message).includes('duplicate')) {
        return NextResponse.json({ error: 'Ese correo ya está invitado.' }, { status: 409 })
      }
      throw error
    }

    // If the teacher already has an account, link her right away (idempotent claim).
    let claimed = false
    try {
      const { createServiceClient } = await import('@/lib/supabase/service')
      const service = createServiceClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (service as any)
        .from('teachers')
        .select('id, school_id')
        .ilike('email', email)
        .maybeSingle()
      if (existing && !existing.school_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any)
          .from('teachers')
          .update({ school_id: admin.school_id, role_type: body.data.role })
          .eq('id', existing.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (service as any)
          .from('school_invites')
          .update({ claimed_at: new Date().toISOString() })
          .eq('school_id', admin.school_id)
          .ilike('email', email)
        claimed = true
      }
    } catch (e) {
      console.error('[school-invites] eager claim skipped:', e)
    }

    // Invitation email (best-effort).
    let emailed = false
    if (process.env.RESEND_API_KEY) {
      try {
        const base =
          process.env.NEXT_PUBLIC_APP_URL ??
          (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
        const resend = new Resend(process.env.RESEND_API_KEY)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const schoolName = (admin.schools as any)?.name ?? 'tu escuela'
        await resend.emails.send({
          from: 'MaestraIA <notificaciones@maestraia.com>',
          to: email,
          replyTo: admin.email ?? undefined,
          subject: `Te invitaron a ${schoolName} en MaestraIA`,
          html: `<p>${escapeHtml(admin.full_name ?? 'La dirección')} te invitó a unirte a <strong>${escapeHtml(schoolName)}</strong> en MaestraIA.</p>
<p><a href="${base}/register" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Crear mi cuenta</a></p>
<p style="color:#666;font-size:13px">Regístrate con este mismo correo (${email}) y quedarás ligada a la escuela automáticamente.</p>`,
        })
        emailed = true
      } catch (e) {
        console.error('[school-invites] email failed:', e)
      }
    }
    return NextResponse.json({ ok: true, emailed, claimed })
  } catch (err) {
    console.error('[school-invites]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Revoking is the admin's "who is out": deleting a CLAIMED invite also detaches the teacher
// from the school (school_id null, role back to teacher) so access ends immediately —
// the account and its own content survive, only the school membership goes.
export async function DELETE(req: NextRequest) {
  const inviteId = req.nextUrl.searchParams.get('id')
  if (!inviteId || !z.string().uuid().safeParse(inviteId).success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Read under RLS first: visible ⇔ the caller is an admin of the invite's school.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite } = await (supabase as any)
    .from('school_invites')
    .select('id, school_id, email, claimed_at')
    .eq('id', inviteId)
    .maybeSingle()
  if (!invite) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })

  if (invite.claimed_at) {
    const service = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: member } = await (service as any)
      .from('teachers')
      .select('id, auth_id')
      .ilike('email', escapeLike(invite.email))
      .eq('school_id', invite.school_id)
      .maybeSingle()
    // Never let an admin lock themself out by revoking their own invite.
    if (member && member.auth_id !== user.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any)
        .from('teachers')
        .update({ school_id: null, role_type: 'teacher' })
        .eq('id', member.id)
    } else if (member && member.auth_id === user.id) {
      return NextResponse.json(
        { error: 'No puedes quitarte a ti misma de la escuela.' },
        { status: 400 }
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('school_invites').delete().eq('id', inviteId)
  if (error) return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
