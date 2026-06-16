import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { checkRateLimit } from '@/lib/rate-limit'

const Schema = z.object({
  group_id: z.string().uuid(),
  assignment_title: z.string().min(1),
  due_date: z.string(),
  // richmond_student_ids of students who did NOT complete the assignment
  student_ids: z.array(z.string()).min(1),
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

    // ponytail: strict rate limit — email sending is expensive and abuse-prone
    const { success, headers } = await checkRateLimit(user.id, 'strict')
    if (!success)
      return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429, headers })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teacher } = await (supabase as any)
      .from('teachers')
      .select('id, full_name, email')
      .eq('auth_id', user.id)
      .single()
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { group_id, assignment_title, due_date, student_ids } = body.data

    // Fetch scores for incomplete students to get their names (for name-based contact matching)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scoreRows } = await (supabase as any)
      .from('richmond_scores')
      .select('richmond_student_id, first_name, last_name')
      .in('richmond_student_id', student_ids)

    // Build a set of normalized names from incomplete students
    const incompleteNames = new Set(
      (scoreRows ?? []).map((s: { first_name: string; last_name: string }) =>
        `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim().toLowerCase()
      )
    )

    // Fetch all contacts for this group, then filter by name match
    // (AI-extracted contacts use a name-derived ID, not the real richmond_student_id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allContacts } = await (supabase as any)
      .from('parent_contacts')
      .select('*')
      .eq('teacher_id', teacher.id)
      .eq('group_id', group_id)

    // Match by richmond_student_id (manual entry) OR by normalized full name (AI-extracted)
    const contacts = (allContacts ?? []).filter(
      (c: {
        richmond_student_id: string
        student_first_name: string | null
        student_last_name: string | null
      }) => {
        if (student_ids.includes(c.richmond_student_id)) return true
        const contactName = `${c.student_first_name ?? ''} ${c.student_last_name ?? ''}`
          .trim()
          .toLowerCase()
        return contactName.length > 0 && incompleteNames.has(contactName)
      }
    )

    if (!contacts || contacts.length === 0)
      return NextResponse.json({
        sent: 0,
        failed: 0,
        message: 'No hay contactos registrados para los alumnos seleccionados.',
      })

    if (!process.env.RESEND_API_KEY)
      return NextResponse.json({ error: 'Email service not configured.' }, { status: 503 })

    const resend = new Resend(process.env.RESEND_API_KEY)
    const fromName = teacher.full_name ?? 'MaestraAI'
    const dueFormatted = new Date(due_date).toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })

    let sent = 0
    let failed = 0

    for (const contact of contacts) {
      const studentName =
        [contact.student_first_name, contact.student_last_name].filter(Boolean).join(' ') ||
        'su hijo/a'
      const parentGreeting = contact.parent_name
        ? `Estimado/a ${contact.parent_name}`
        : 'Estimado/a padre/madre de familia'

      try {
        await resend.emails.send({
          from: `${fromName} <notificaciones@maestraia.com>`,
          replyTo: teacher.email ?? undefined,
          to: contact.parent_email,
          subject: `Recordatorio: tarea pendiente de ${studentName}`,
          html: `
            <p>${parentGreeting},</p>
            <p>Le informamos que <strong>${studentName}</strong> aún no ha entregado la siguiente tarea:</p>
            <blockquote style="border-left:3px solid #6366f1;padding:8px 16px;margin:16px 0;color:#374151;">
              <strong>${assignment_title}</strong><br/>
              Fecha límite: ${dueFormatted}
            </blockquote>
            <p>Por favor apóyele a completarla a la brevedad posible.</p>
            <p>Cualquier duda estamos en contacto.</p>
            <br/>
            <p style="color:#6b7280;font-size:13px;">— ${fromName} · MaestraAI</p>
          `,
        })
        sent++
      } catch (err) {
        console.error(`Failed to send to ${contact.parent_email}:`, err)
        failed++
      }
    }

    return NextResponse.json({ sent, failed })
  } catch (err) {
    console.error('Notify POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
