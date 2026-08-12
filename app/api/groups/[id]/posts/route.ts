import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { z } from 'zod'
import { Resend } from 'resend'
import { checkRateLimit } from '@/lib/rate-limit'
import { decrypt } from '@/lib/encryption'
import { mergeRecipients } from '@/lib/groups/classroom'

// Group classroom wall: POST publishes an anuncio/tarea AND emails every family of the group
// (student contact emails + invited parents, deduped). GET lists the wall. Teacher-only; RLS
// gives parents read access via /familia's own fetch.

const PostSchema = z
  .object({
    kind: z.enum(['anuncio', 'tarea']),
    title: z.string().trim().min(1, 'Ponle título').max(200),
    body: z.string().trim().max(5000).optional(),
    material_id: z.string().uuid().optional(),
    due_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .refine((d) => d.kind !== 'tarea' || d.material_id, {
    message: 'Una tarea necesita un material asignado',
  })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ownGroup(supabase: any, userId: string, groupId: string) {
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id, full_name, email')
    .eq('auth_id', userId)
    .single()
  if (!teacher) return null
  const { data: group } = await supabase
    .from('groups')
    .select('id, name, titular_teacher_id')
    .eq('id', groupId)
    .single()
  if (!group || group.titular_teacher_id !== teacher.id) return null
  return { teacher, group }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = PostSchema.safeParse(await req.json().catch(() => null))
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 })
    }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { success } = await checkRateLimit(user.id, 'standard', 'group-posts')
    if (!success) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })

    const own = await ownGroup(supabase, user.id, params.id)
    if (!own) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 })
    const { teacher, group } = own

    // A tarea's material must be the teacher's own, and needs a play token for the family link.
    let material: { id: string; play_token: string | null; type: string } | null = null
    if (body.data.material_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: m } = await (supabase as any)
        .from('materials')
        .select('id, play_token, type, teacher_id')
        .eq('id', body.data.material_id)
        .single()
      if (!m || m.teacher_id !== teacher.id) {
        return NextResponse.json({ error: 'Material no encontrado' }, { status: 404 })
      }
      material = m
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: post, error } = await (supabase as any)
      .from('group_posts')
      .insert({
        teacher_id: teacher.id,
        group_id: group.id,
        kind: body.data.kind,
        title: body.data.title,
        body: body.data.body || null,
        material_id: body.data.material_id ?? null,
        due_date: body.data.due_date ?? null,
      })
      .select('id')
      .single()
    if (error) throw error

    // ── Recipients: student contact emails + invited parents of THIS group, deduped. ──
    const service = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: students } = await (service as any)
      .from('students')
      .select('id, parent_contact_encrypted')
      .eq('group_id', group.id)
    const studentIds: string[] = (students ?? []).map((s: { id: string }) => s.id)
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
    const recipients = mergeRecipients(contactEmails, inviteEmails)

    // ── Send (best-effort per address — one bad email never blocks the rest). ──
    const base =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const playUrl = material?.play_token ? `${base}/jugar/${material.play_token}` : null
    const due = body.data.due_date
      ? new Date(`${body.data.due_date}T12:00:00`).toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'long',
        })
      : null
    const html = `<p><strong>${group.name}</strong> — ${body.data.kind === 'tarea' ? 'Nueva tarea' : 'Anuncio'} de ${teacher.full_name ?? 'la maestra'}:</p>
<h2 style="margin:8px 0">${body.data.title}</h2>
${body.data.body ? `<p style="white-space:pre-line">${body.data.body}</p>` : ''}
${playUrl ? `<p><a href="${playUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Abrir la actividad</a></p>` : ''}
${due ? `<p style="color:#666">Fecha límite: ${due}</p>` : ''}
<p style="color:#666;font-size:13px"><a href="${base}/familia">Ver todos los anuncios en MaestraIA</a></p>`

    let sent = 0
    if (recipients.length && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      for (const to of recipients) {
        try {
          await resend.emails.send({
            from: 'MaestraIA <notificaciones@maestraia.com>',
            to,
            replyTo: teacher.email ?? undefined,
            subject: `${body.data.kind === 'tarea' ? '📝 Tarea' : '📣 Anuncio'}: ${body.data.title}`,
            html,
          })
          sent++
        } catch (err) {
          console.error('[group-posts] send failed:', err)
        }
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: logError } = await (service as any)
      .from('group_post_emails')
      .insert({ post_id: post.id, sent, total: recipients.length })
    if (logError) console.error('[group-posts] email log skipped:', logError)

    return NextResponse.json({ id: post.id, sent, total: recipients.length })
  } catch (err) {
    console.error('[group-posts]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const own = await ownGroup(supabase, user.id, params.id)
    if (!own) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: posts } = await (supabase as any)
      .from('group_posts')
      .select(
        'id, kind, title, body, material_id, due_date, created_at, materials(type, play_token, content), group_post_emails(sent, total)'
      )
      .eq('group_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50)
    return NextResponse.json({ posts: posts ?? [] })
  } catch (err) {
    console.error('[group-posts:get]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const postId = req.nextUrl.searchParams.get('post_id')
    if (!postId || !z.string().uuid().safeParse(postId).success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const own = await ownGroup(supabase, user.id, params.id)
    if (!own) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 })
    // RLS also scopes this delete to the owning teacher.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('group_posts')
      .delete()
      .eq('id', postId)
      .eq('group_id', params.id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[group-posts:delete]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
