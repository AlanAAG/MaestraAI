import type { TeacherProfile } from '@/types/teacher-profile'
import { METHODOLOGY_STRUCTURE } from './methodologies'

/** Resolve once, before automatic choices mutate the unit. Prompt and validator must agree. */
export function mainHeadings(
  explicitMethodology: string | null | undefined,
  profile: TeacherProfile | null,
  fallbackMethodology = 'Proyecto'
): string[] {
  if (
    explicitMethodology &&
    explicitMethodology !== 'Automático' &&
    METHODOLOGY_STRUCTURE[explicitMethodology]
  ) {
    return METHODOLOGY_STRUCTURE[explicitMethodology].map((m) => m.label)
  }
  const uploaded = profile?.formatting_rules?.proyecto_subheadings?.length
    ? profile.formatting_rules.proyecto_subheadings
    : profile?.subplan_inventory?.find((unit) => /proyecto|situaci[oó]n/i.test(unit.metodologia))
        ?.secciones
  return uploaded?.length
    ? uploaded
    : (METHODOLOGY_STRUCTURE[fallbackMethodology] ?? METHODOLOGY_STRUCTURE.Proyecto).map(
        (m) => m.label
      )
}

export function mainHeadingsBlock(headings: string[]): string {
  return `<estructura_proyecto>\nEl desarrollo principal DEBE usar EXACTAMENTE estos sub-encabezados, completos y en este orden. Desarrolla actividades concretas bajo cada uno:\n${headings.map((h) => `**${h}**`).join('\n')}\n</estructura_proyecto>`
}
