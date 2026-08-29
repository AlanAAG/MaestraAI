/**
 * Guía Portage — developmental milestones as age-appropriateness grounding.
 *
 * The Portage guide is a milestone checklist banded by year of age. It answers a
 * question the NEM documents don't: *what can a child this age actually do?* —
 * which is what keeps generated activities from being too advanced or babyish.
 *
 * Injected deterministically by grade rather than retrieved through the NEM vector
 * search: retrieval there is an unfiltered global top-k, so milestone passages would
 * rarely win a slot against SEP prose, and the band is known exactly from the group's
 * grade anyway. Cheaper and reliable.
 *
 * Data source: context/guia-portage.md → lib/nem/portage-data.ts
 * (regenerate with `node scripts/build-portage-data.mjs`).
 */
import { PORTAGE_MILESTONES, type PortageBand, type PortageArea } from './portage-data'

export type { PortageBand, PortageArea }

/**
 * School grade label → Portage age band.
 * Preschool in Mexico: Kinder 1 ≈ 3 años, Kinder 2 ≈ 4, Kinder 3 ≈ 5.
 * Defaults to 5-6 (Kinder 3), matching the default persona used elsewhere.
 */
export function bandForGrade(grade?: string | null): PortageBand {
  const g = (grade ?? '').toLowerCase()
  if (g.includes('maternal')) return '2-3'
  if (g.includes('1')) return '3-4'
  if (g.includes('2')) return '4-5'
  if (g.includes('3') || g.includes('preprimaria')) return '5-6'
  return '5-6'
}

/** Human label for the band, for use inside prompt copy. */
export function bandLabel(band: PortageBand): string {
  const [from, to] = band.split('-')
  return `${from} a ${to} años`
}

/**
 * Prompt block describing what children of this grade can typically do.
 *
 * Framed as a calibration reference, NOT as objectives to copy: these are
 * developmental milestones, not NEM contenidos/PDAs, and must never leak into the
 * plan as if they were official curriculum. The plan's contenidos still come
 * verbatim from the official bank.
 */
export function portageBlock(grade?: string | null): string {
  const band = bandForGrade(grade)
  const areas = PORTAGE_MILESTONES[band]

  const body = (Object.keys(areas) as PortageArea[])
    .filter((a) => areas[a]?.length)
    .map((a) => `  ${a}:\n${areas[a]!.map((m) => `    • ${m}`).join('\n')}`)
    .join('\n')

  return `<desarrollo_esperado edad="${bandLabel(band)}" fuente="Guía Portage">
CALIBRACIÓN DE EDAD. Esto describe lo que un niño de ${bandLabel(band)} típicamente YA PUEDE hacer. Úsalo para ajustar la exigencia de cada actividad: que no sea demasiado avanzada ni demasiado infantil, y para redactar aspectos a evaluar que sean realmente observables a esta edad.

NO son contenidos ni PDA. NUNCA los cites como currículo oficial, no los copies textualmente dentro del plan y no los presentes como objetivos NEM. Los Contenidos y PDA oficiales vienen únicamente del banco verbatim.

${body}
</desarrollo_esperado>`
}
