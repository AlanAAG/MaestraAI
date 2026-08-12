// Pure helpers for the group classroom (anuncios + tareas). Routes stay thin.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** students.parent_contact holds a phone OR an email — only emails can receive announcements. */
export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && EMAIL_RE.test(value.trim())
}

/** Merge family emails (student contacts + invited parents), dedup case-insensitively. */
export function mergeRecipients(...lists: (string | null | undefined)[][]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const raw of list) {
      const email = String(raw ?? '').trim()
      if (!isEmail(email)) continue
      const key = email.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(email)
    }
  }
  return out
}

export type PlayRow = { material_id: string; passed: boolean | null }

/** Tarea delivery: entregado when any of the child's runs on that material didn't fail the
 * homework threshold (passed true, or no threshold → passed null). */
export function tareaEntregada(materialId: string | null, plays: PlayRow[]): boolean {
  if (!materialId) return false
  return plays.some((p) => p.material_id === materialId && p.passed !== false)
}
