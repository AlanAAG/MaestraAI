/**
 * The ALUMNOS CON NEE block of the plan prompt.
 *
 * Two sources feed it and both are optional:
 *  - students flagged has_nee in the roster (anonymised to "Alumno A/B…" + their decrypted note)
 *  - the teacher's free-text description written on the plan form
 *
 * The second exists because the roster is a heavy prerequisite: a teacher with no students
 * entered had no way to mention a case at all, so every plan claimed the group had no NEE.
 */
import { scrubNames } from './extract-template'

export type NeeStudent = { display_name: string; nee_notes?: string | null }

/** Cap: this is prompt real estate, and the section only needs the support needs. */
const MAX_PLAN_NOTES = 1500

export function buildNeeSection(
  students: NeeStudent[],
  planNotes?: string | null,
  emptyFallbackRule = ''
): string {
  const parts: string[] = []

  if (students.length > 0) {
    parts.push(
      students.map((s) => `- ${s.display_name}${s.nee_notes ? ': ' + s.nee_notes : ''}`).join('\n')
    )
  }

  // Names never reach the model, whichever source the text came from.
  const free = scrubNames(String(planNotes ?? '').trim()).slice(0, MAX_PLAN_NOTES)
  if (free) {
    parts.push(
      `La maestra describió estos casos para ESTA planeación (sin nombres — refiérete a ellos de forma anónima):\n${free}`
    )
  }

  if (!parts.length) {
    return `NEE: ninguno identificado en este grupo. ${emptyFallbackRule}`.trim()
  }

  return `ALUMNOS CON NEE (incluir en ajustes_razonables, con viñetas CONCRETAS para cada caso):\n${parts.join('\n\n')}`
}
