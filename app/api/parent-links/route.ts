// Parent invite links — teacher mints an invite for a student's parent, emailed via Resend.
// GET lists the teacher's links (RLS-scoped). DELETE revokes (access off instantly).
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { encrypt } from '@/lib/encryption'
import { decryptName } from '@/lib/students/name'
import { logAudit } from '@/lib/audit'
import { mintInviteToken, linkStatus } from '@/lib/parents/links'

const PostSchema = z.object({
  student_id: z.string().uuid(),
  parent_email: z.string().email().max(200),
})

const INVITE_DAYS = 7

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTeacher(supabase: any, authId: string) {
  const { data } = await supabase
    .from('teachers')
    .select('id, full_name, email')
    .eq('auth_id', authId)
    .single()
  return data
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('parent_links')
      .select('id, student_id, expires_at, claimed_at, revoked_at, created_at')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ links: [] }) // table may not exist pre-migration

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const links = (data ?? []).map((l: any) => ({ ...l, status: linkStatus(l) }))
    return NextResponse.json({ links })
  } catch (err) {
    console.error('[parent-links GET]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'strict', 'parent-invite')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    const body = PostSchema.safeParse(await req.json().catch(() => null))
    if (!body.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

    const teacher = await getTeacher(supabase, user.id)
    if (!teacher) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    // Ownership: the student must be in one of this teacher's groups.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: student } = await (supabase as any)
      .from('students')
      .select('id, first_name_encrypted, groups(titular_teacher_id)')
      .eq('id', body.data.student_id)
      .single()
    if (!student || student.groups?.titular_teacher_id !== teacher.id)
      return NextResponse.json({ error: 'Alumno no encontrado' }, { status: 404 })

    const token = mintInviteToken()
    const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 3600 * 1000).toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: link, error: insErr } = await (supabase as any)
      .from('parent_links')
      .insert({
        teacher_id: teacher.id,
        student_id: student.id,
        invite_token: token,
        invite_email_encrypted: await encrypt(body.data.parent_email.toLowerCase().trim()),
        expires_at: expiresAt,
      })
      .select('id')
      .single()
    if (insErr || !link) {
      console.error('[parent-links POST]', insErr)
      return NextResponse.json(
        { error: 'No se pudo crear la invitación. ¿Migración 065 aplicada?' },
        { status: 500 }
      )
    }

    // Send the invite (best-effort: link exists even if the email fails).
    let emailed = false
    if (process.env.RESEND_API_KEY) {
      const childName = await decryptName(student)
        .then((n) => n.first || 'su hijo/a')
        .catch(() => 'su hijo/a')
      const url = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://maestraia.com'}/familia/invitacion/${token}`
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: `${teacher.full_name ?? 'MaestraIA'} <notificaciones@maestraia.com>`,
          replyTo: teacher.email ?? undefined,
          to: body.data.parent_email,
          subject: `Invitación para seguir el progreso de ${childName}`,
          html: `<p>Hola,</p>
<p>La maestra <strong>${teacher.full_name ?? ''}</strong> te invita a crear una cuenta en MaestraIA para ver las tareas y los juegos de <strong>${childName}</strong>.</p>
<p><a href="${url}" style="display:inline-block;padding:10px 20px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none">Aceptar invitación</a></p>
<p>El enlace vence en ${INVITE_DAYS} días. Si no esperabas este correo, puedes ignorarlo.</p>`,
        })
        emailed = true
      } catch (err) {
        console.error('[parent-links email]', err)
      }
    }

    await logAudit({
      teacher_id: teacher.id,
      action: 'parent_link.invite',
      resource_type: 'parent_link',
      resource_id: link.id,
      req,
    })

    return NextResponse.json({ id: link.id, emailed, expires_at: expiresAt }, { status: 201 })
  } catch (err) {
    console.error('[parent-links POST]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { success, headers } = await checkRateLimit(user.id, 'standard', 'parent-invite')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    const id = req.nextUrl.searchParams.get('id')
    if (!id || !z.string().uuid().safeParse(id).success)
      return NextResponse.json({ error: 'id inválido' }, { status: 400 })

    const teacher = await getTeacher(supabase, user.id)
    if (!teacher) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    // RLS restricts to own rows; revoke instead of delete to keep the audit trail.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('parent_links')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .is('revoked_at', null)
    if (error) throw error

    await logAudit({
      teacher_id: teacher.id,
      action: 'parent_link.revoke',
      resource_type: 'parent_link',
      resource_id: id,
      req,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[parent-links DELETE]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
