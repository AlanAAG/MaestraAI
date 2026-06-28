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

/** Grade levels for PRONI applicability */
export const PRONI_GRADES = ['Kinder 3'] as const

/** Check if PRONI applies to a given grade */
export function isProniApplicable(grade: string): boolean {
  return PRONI_GRADES.includes(grade as (typeof PRONI_GRADES)[number])
}
