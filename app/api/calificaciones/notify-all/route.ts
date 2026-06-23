// POST /api/calificaciones/notify-all  { group_id }
// Sends ONE digest email per parent listing all of their child's still-pending Richmond tasks.
// Avoids spamming a separate email per task. Manual one-click (no cron).
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

const Schema = z.object({ group_id: z.string().uuid() })

export async function POST(req: NextRequest) {
  try {
    const body = Schema.safeParse(await req.json())
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 422 })
    const { group_id } = body.data

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    // Assignments for the group (RLS-scoped).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: assignData } = await (supabase as any)
      .from('richmond_assignments')
      .select('id, title, due_at')
      .eq('group_id', group_id)
      .order('due_at', { ascending: true })
    const assignments = (assignData ?? []) as Array<{ id: string; title: string; due_at: string }>
    if (assignments.length === 0)
      return NextResponse.json({ sent: 0, failed: 0, message: 'Sin tareas en este grupo.' })

    const assignmentIds = assignments.map((a) => a.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scoreData } = await (supabase as any)
      .from('richmond_scores')
      .select(
        'assignment_id, student_id, richmond_student_id, first_name_encrypted, last_name_encrypted, done'
      )
      .in('assignment_id', assignmentIds)

    type Row = {
      assignment_id: string
      student_id: string | null
      richmond_student_id: string
      first_name_encrypted: string | null
      last_name_encrypted: string | null
      done: boolean
    }
    const rows = (scoreData ?? []) as Row[]

    // ponytail: small pivot inline — mirrors /api/calificaciones/scores; not worth a shared abstraction.
    const keyOf = (r: Row) => r.student_id ?? `rid:${r.richmond_student_id}`
    type Student = {
      rid: string
      name: string
      submitted: Record<string, boolean>
    }
    const studentMap = new Map<string, Student>()
    for (const r of rows) {
      const k = keyOf(r)
      let s = studentMap.get(k)
      if (!s) {
        const first = r.first_name_encrypted ? await decrypt(r.first_name_encrypted) : ''
        const last = r.last_name_encrypted ? await decrypt(r.last_name_encrypted) : ''
        s = { rid: r.richmond_student_id, name: `${first} ${last}`.trim(), submitted: {} }
        studentMap.set(k, s)
      }
      s.submitted[r.assignment_id] = r.done
    }

    // Per student: the list of pending tasks (no done=true row for that assignment).
    const pendingByName = new Map<string, { rid: string; pending: typeof assignments }>()
    const pendingByRid = new Map<string, { name: string; pending: typeof assignments }>()
    for (const s of Array.from(studentMap.values())) {
      const pending = assignments.filter((a) => !s.submitted[a.id])
      if (pending.length === 0) continue
      if (s.name) pendingByName.set(normName(s.name), { rid: s.rid, pending })
      pendingByRid.set(s.rid, { name: s.name, pending })
    }

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
    const fromName = teacher.full_name ?? 'MaestraIA'
    const fmtDue = (d: string) =>
      new Date(d).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

    let sent = 0
    let failed = 0
    const emailed = new Set<string>() // de-dupe if two contacts share an email

    for (const c of contacts) {
      // Match by exact richmond_student_id (manual) OR decrypted name (AI-extracted).
      const match =
        pendingByRid.get(c.richmond_student_id) ??
        (c.studentName ? pendingByName.get(normName(c.studentName)) : undefined)
      if (!match || match.pending.length === 0) continue
      if (emailed.has(c.email)) continue
      emailed.add(c.email)

      const studentName = c.studentName || 'su hijo/a'
      const tareas = tareasBlock(
        match.pending.map((a) => ({ title: a.title, due: fmtDue(a.due_at) }))
      )
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
        console.error(`Failed to send digest to contact ${c.id}:`, err)
        failed++
      }
    }

    return NextResponse.json({ sent, failed })
  } catch (err) {
    console.error('notify-all POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
