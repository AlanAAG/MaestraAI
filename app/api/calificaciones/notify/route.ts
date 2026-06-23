import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { checkRateLimit } from '@/lib/rate-limit'
import { decrypt } from '@/lib/encryption'
import {
  decryptContacts,
  normName,
  parentGreeting,
  renderTemplate,
  tareasBlock,
} from '@/lib/calificaciones/notify'

const Schema = z.object({
  group_id: z.string().uuid(),
  assignment_title: z.string().min(1),
  due_date: z.string(),
  student_ids: z.array(z.string()).min(1), // richmond_student_ids OR contact ids of pending students
})

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 422 })

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ponytail: strict rate limit — email sending is abuse-prone
    const { success, headers } = await checkRateLimit(user.id, 'strict')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id, full_name, email, parent_email_template')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { group_id, assignment_title, due_date, student_ids } = body.data

    // Decrypt richmond_scores names for the targeted students to enable name-based matching.
    // richmond_scores.first_name/last_name are NULL after migration 030 — use encrypted columns.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scoreRows } = await (supabase as any)
      .from('richmond_scores')
      .select('richmond_student_id, first_name_encrypted, last_name_encrypted')
      .in('richmond_student_id', student_ids)

    const incompleteNames = new Set(
      await Promise.all(
        (scoreRows ?? []).map(
          async (s: {
            first_name_encrypted: string | null
            last_name_encrypted: string | null
          }) => {
            const first = s.first_name_encrypted ? await decrypt(s.first_name_encrypted) : ''
            const last = s.last_name_encrypted ? await decrypt(s.last_name_encrypted) : ''
            return normName(`${first} ${last}`)
          }
        )
      )
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: contactRows } = await (supabase as any)
      .from('parent_contacts')
      .select('*')
      .eq('teacher_id', teacher.id)
      .eq('group_id', group_id)

    if (!contactRows || contactRows.length === 0)
      return NextResponse.json({ sent: 0, failed: 0, message: 'Sin contactos para este grupo.' })

    if (!process.env.RESEND_API_KEY)
      return NextResponse.json({ error: 'Email service not configured.' }, { status: 503 })

    const contacts = await decryptContacts(contactRows)
    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromName = teacher.full_name ?? 'MaestraAI'
    const dueFormatted = new Date(due_date).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
    const tareas = tareasBlock([{ title: assignment_title, due: dueFormatted }])

    let sent = 0
    let failed = 0

    for (const c of contacts) {
      // Match by exact richmond_student_id (manual entry) OR by decrypted name (AI-extracted)
      const matches =
        student_ids.includes(c.richmond_student_id) ||
        (c.studentName.length > 0 && incompleteNames.has(normName(c.studentName)))
      if (!matches) continue

      const studentName = c.studentName || 'su hijo/a'
      const { subject, html } = renderTemplate(teacher.parent_email_template, {
        padre: parentGreeting(c.parentName),
        alumno: studentName,
        tareas,
        maestra: fromName,
      })

      try {
        await resend.emails.send({
          from: `${fromName} <notificaciones@maestraia.com>`,
          replyTo: teacher.email ?? undefined,
          to: c.email,
          subject,
          html,
        })
        sent++
      } catch (err) {
        console.error(`Failed to send to contact ${c.id}:`, err)
        failed++
      }
    }

    return NextResponse.json({ sent, failed })
  } catch (err) {
    console.error('Notify POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
