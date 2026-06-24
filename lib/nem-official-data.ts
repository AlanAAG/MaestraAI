/**
 * Official NEM (Nueva Escuela Mexicana) Framework Data
 * Source: Programa de Estudio para la Educación Preescolar, Fase 2
 * Secretaría de Educación Pública, 2024
 */

export const CAMPOS_FORMATIVOS = [
  {
    id: 'lenguajes',
    name: 'Lenguajes',
    description: 'Comunicación oral y escrita, lenguas extranjeras (PRONI), lenguajes artísticos',
  },
  {
    id: 'saberes',
    name: 'Saberes y Pensamiento Científico',
    description: 'Ciencias naturales, matemáticas, fenómenos naturales, experimentación',
  },
  {
    id: 'etica',
    name: 'Ética, Naturaleza y Sociedades',
    description: 'Ética, sociedad, naturaleza, ciudadanía, derechos humanos',
  },
  {
    id: 'humano',
    name: 'De lo Humano y lo Comunitario',
    description: 'Desarrollo humano, educación física, emociones, salud, identidad',
  },
] as const

/**
 * 7 Ejes Articuladores — canonical names (Plan de Estudio 2022, §8.1).
 * Source: context/Plan-de-Estudio-2022.md
 */
export const EJES_ARTICULADORES = [
  'Inclusión',
  'Pensamiento crítico',
  'Interculturalidad crítica',
  'Igualdad de género',
  'Vida saludable',
  'Apropiación de las culturas a través de la lectura y la escritura',
  'Artes y experiencias estéticas',
] as const

/**
 * PRONI (Programa Nacional de Inglés) — 6 official content areas, Fase 2 / 3er grado only.
 * Part of Campo Formativo: Lenguajes. Verbatim PDAs live in lib/nem/grounding.ts (PRONI_FASE2).
 * Source: context/PRONI_2024-2025.md
 */
export const PRONI_CONTENT_AREAS = [
  { id: 'cuerpo', name: 'Cuerpo, imagen e identidad' },
  {
    id: 'sensaciones',
    name: 'Sensaciones, emociones, sentimientos e ideas expresados en lengua inglesa',
  },
  { id: 'textos', name: 'Textos orales y escritos en lengua inglesa' },
  { id: 'manifestaciones', name: 'Manifestaciones culturales y artísticas' },
  { id: 'entornos', name: 'Entornos naturales y sociales' },
  {
    id: 'graficos',
    name: 'Elementos y recursos gráficos, lúdicos y estéticos de la lengua inglesa',
  },
] as const

/**
 * NEM Principles - Core values from official framework
 * Source: La Nueva Escuela Mexicana: principios y orientaciones pedagógicas, SEP 2019
 */
export const NEM_PRINCIPLES = [
  'Identidad con México',
  'Responsabilidad ciudadana',
  'Honestidad',
  'Transformación social',
  'Dignidad humana',
  'Interculturalidad',
  'Cultura de paz',
  'Respeto al medio ambiente',
] as const

/**
 * Official citations for PDF exports and documentation
 */
export const SEP_CITATIONS = {
  programaSintetico:
    'Programa de Estudio para la Educación Preescolar, Fase 2. Secretaría de Educación Pública, 2024.',
  nemPrinciples:
    'La Nueva Escuela Mexicana: principios y orientaciones pedagógicas. Secretaría de Educación Pública, 2019.',
  proni: 'Programa Nacional de Inglés (PRONI) 2024-2025. Secretaría de Educación Pública, 2024.',
} as const

/**
 * Grade levels for PRONI applicability
 */
export const PRONI_GRADES = ['Kinder 3'] as const

/**
 * Check if PRONI applies to a given grade
 */
export function isProniApplicable(grade: string): boolean {
  return PRONI_GRADES.includes(grade as (typeof PRONI_GRADES)[number])
}

/**
 * Evaluation labels - NEM requires qualitative only (no numeric grades)
 */
export const EVALUATION_LABELS = {
  si: 'Logrado',
  en_proceso: 'En proceso',
  no: 'Requiere apoyo',
  sin_evaluar: 'Sin evaluar',
} as const
