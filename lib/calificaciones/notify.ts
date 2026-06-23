// Shared building blocks for parent homework-reminder emails.
// Used by /api/calificaciones/notify (per-task) and /api/calificaciones/notify-all (digest).
// ponytail: shared because both routes need the exact same decrypt + template render.
import { decrypt } from '@/lib/encryption'

export type EmailTemplate = { subject: string; body: string }

// Placeholders: {padre} (parent greeting), {alumno} (student name), {tareas} (rendered task block).
export const DEFAULT_TEMPLATE: EmailTemplate = {
  subject: 'Recordatorio: tarea pendiente de {alumno}',
  body: [
    '<p>{padre},</p>',
    '<p>Le informamos que <strong>{alumno}</strong> aún no ha entregado:</p>',
    '{tareas}',
    '<p>Por favor apóyele a completarla a la brevedad posible.</p>',
    '<p>Cualquier duda estamos en contacto.</p>',
  ].join('\n'),
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Renders the styled blockquote listing one or more pending tasks. `title` is escaped; `due` is pre-formatted.
export function tareasBlock(items: { title: string; due: string }[]): string {
  const rows = items
    .map((i) => `<strong>${escapeHtml(i.title)}</strong><br/>Fecha límite: ${escapeHtml(i.due)}`)
    .join('<br/><br/>')
  return `<blockquote style="border-left:3px solid #6366f1;padding:8px 16px;margin:16px 0;color:#374151;">${rows}</blockquote>`
}

function fill(str: string, vars: Record<string, string>): string {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '')
}

// `template` may be a teacher's saved override (or null → DEFAULT_TEMPLATE).
// `tareas` is trusted pre-built HTML (from tareasBlock); text vars are escaped here.
export function renderTemplate(
  template: EmailTemplate | null | undefined,
  vars: { padre: string; alumno: string; tareas: string; maestra: string }
): { subject: string; html: string } {
  const t = template?.subject && template?.body ? template : DEFAULT_TEMPLATE
  const filled = {
    padre: escapeHtml(vars.padre),
    alumno: escapeHtml(vars.alumno),
    tareas: vars.tareas,
  }
  const subject = fill(t.subject, filled)
  const html = `${fill(t.body, filled)}\n<br/>\n<p style="color:#6b7280;font-size:13px;">— ${escapeHtml(
    vars.maestra
  )} · MaestraAI</p>`
  return { subject, html }
}

export const normName = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

export type DecryptedContact = {
  id: string
  richmond_student_id: string
  email: string
  studentName: string // decrypted "first last", trimmed (may be '')
  parentName: string | null
}

type ContactRow = {
  id: string
  richmond_student_id: string
  parent_email_encrypted: string
  student_first_name_encrypted: string | null
  student_last_name_encrypted: string | null
  parent_name_encrypted: string | null
}

// Decrypts parent_contacts rows; drops any whose required email fails to decrypt.
export async function decryptContacts(rows: ContactRow[]): Promise<DecryptedContact[]> {
  const out: DecryptedContact[] = []
  for (const c of rows) {
    let email: string
    try {
      email = await decrypt(c.parent_email_encrypted)
    } catch {
      continue // unreadable email → unusable contact
    }
    const first = c.student_first_name_encrypted
      ? await decrypt(c.student_first_name_encrypted).catch(() => '')
      : ''
    const last = c.student_last_name_encrypted
      ? await decrypt(c.student_last_name_encrypted).catch(() => '')
      : ''
    const parentName = c.parent_name_encrypted
      ? await decrypt(c.parent_name_encrypted).catch(() => null)
      : null
    out.push({
      id: c.id,
      richmond_student_id: c.richmond_student_id,
      email,
      studentName: `${first} ${last}`.trim(),
      parentName,
    })
  }
  return out
}

export const parentGreeting = (parentName: string | null) =>
  parentName ? `Estimado/a ${parentName}` : 'Estimado/a padre/madre de familia'
