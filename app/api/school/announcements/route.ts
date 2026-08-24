import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { logAudit, AUDIT_ACTIONS } from '@/lib/audit'
import { checkRateLimit } from '@/lib/rate-limit'
import { decrypt } from '@/lib/encryption'
import { mergeRecipients } from '@/lib/groups/classroom'
import { sendPushToAuthIds, parentAuthIdsForGroups } from '@/lib/push/send'
import { escapeHtml } from '@/lib/html'

// Sequential school-wide emails can exceed the default serverless window (same as group posts).
export const maxDuration = 60

// School-wide email volume guard: one aviso never emails more than this many addresses.
const MAX_EMAIL_RECIPIENTS = 300

const PostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  priority: z.enum(['normal', 'high', 'urgent']).default('normal'),
  expires_at: z.string().datetime().optional(),
  notify: z.boolean().default(false),
})

async function getTeacher(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('teachers')
    .select('id, school_id, role_type')
    .eq('auth_id', userId)
    .single()
  return data
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // RLS enforces school scoping — just fetch and filter expired
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('school_announcements')
      .select('*, teachers!author_teacher_id(full_name, role_type)')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('published_at', { ascending: false })
      .limit(30)

    if (error) throw error
    return NextResponse.json({ announcements: data || [] })
  } catch (err) {
    console.error('GET announcements error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rl = await checkRateLimit(user.id, 'standard', 'school-write')
    if (!rl.success)
      return NextResponse.json(
        { error: 'Demasiadas solicitudes.' },
        { status: 429, headers: rl.headers }
      )

    const teacher = await getTeacher(supabase, user.id)
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!teacher.school_id)
      return NextResponse.json({ error: 'Sin escuela asignada' }, { status: 400 })

    if (!['admin', 'coordinator'].includes(teacher.role_type)) {
      return NextResponse.json(
        { error: 'Forbidden — solo admins y coordinadoras pueden publicar avisos' },
        { status: 403 }
      )
    }

    const body = PostSchema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 })

    const { notify, ...announcement } = body.data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('school_announcements')
      .insert({
        school_id: teacher.school_id,
        author_teacher_id: teacher.id,
        ...announcement,
      })
      .select()
      .single()

    if (error) throw error

    // ── Notify families of every active group of the school (best-effort). ──
    let emailed = 0
    try {
      const service = createServiceClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: groups } = await (service as any)
        .from('groups')
        .select('id')
        .eq('school_id', teacher.school_id)
        .is('archived_at', null)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const groupIds = (groups ?? []).map((g: any) => g.id)

      // Push always (it's opt-in per device, zero spam risk).
      const authIds = await parentAuthIdsForGroups(service, groupIds)
      await sendPushToAuthIds(service, authIds, {
        title: `🏫 Aviso de la escuela: ${announcement.title}`,
        body: announcement.content.slice(0, 140),
      })

      // Email only when the author asked for it.
      if (notify && groupIds.length && process.env.RESEND_API_KEY) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: students } = await (service as any)
          .from('students')
          .select('id, parent_contact_encrypted')
          .in('group_id', groupIds)
        const contactEmails: string[] = []
        for (const s of students ?? []) {
          if (!s.parent_contact_encrypted) continue
          try {
            contactEmails.push(await decrypt(s.parent_contact_encrypted))
          } catch {
            /* undecryptable → skip */
          }
        }
        const inviteEmails: string[] = []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const studentIds = (students ?? []).map((s: any) => s.id)
        if (studentIds.length) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: links } = await (service as any)
            .from('parent_links')
            .select('invite_email_encrypted, revoked_at')
            .in('student_id', studentIds)
            .is('revoked_at', null)
          for (const l of links ?? []) {
            try {
              inviteEmails.push(await decrypt(l.invite_email_encrypted))
            } catch {
              /* skip */
            }
          }
        }
        const recipients = mergeRecipients(contactEmails, inviteEmails).slice(
          0,
          MAX_EMAIL_RECIPIENTS
        )
        const resend = new Resend(process.env.RESEND_API_KEY)
        const html = `<p><strong>Aviso de la escuela</strong></p>
<h2 style="margin:8px 0">${escapeHtml(announcement.title)}</h2>
<p style="white-space:pre-line">${escapeHtml(announcement.content)}</p>
<p style="color:#666;font-size:13px">Publicado por la dirección/coordinación de tu escuela en MaestraIA.</p>`
        for (const to of recipients) {
          try {
            await resend.emails.send({
              from: 'MaestraIA <notificaciones@maestraia.com>',
              to,
              subject: `🏫 Aviso de la escuela: ${announcement.title}`,
              html,
            })
            emailed++
          } catch (err) {
            console.error('[announcements] send failed:', err)
          }
        }
      }
    } catch (err) {
      console.error('[announcements] notify skipped:', err)
    }

    await logAudit({
      teacher_id: teacher.id,
      action: AUDIT_ACTIONS.ANNOUNCEMENT_CREATE,
      resource_type: 'announcement',
      resource_id: data.id,
      req,
    })

    return NextResponse.json({ announcement: data, emailed }, { status: 201 })
  } catch (err) {
    console.error('POST announcement error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
