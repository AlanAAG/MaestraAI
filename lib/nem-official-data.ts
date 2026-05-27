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
 * Ejes Articuladores - NOT FOUND in official documentation
 * Current implementation uses these 7 axes, but official source not yet verified
 * TODO: Verify from complete Programa Sintético or official SEP documentation
 */
export const EJES_ARTICULADORES = [
  'Inclusión',
  'Pensamiento crítico',
  'Interculturalidad',
  'Igualdad de género',
  'Vida saludable',
  'Lectura y escritura',
  'Artes',
] as const

/**
 * PRONI (Programa Nacional de Inglés) Content Areas
 * Applies ONLY to Kinder 3 (Tercer grado de Preescolar)
 * Part of Campo Formativo: Lenguajes
 *
 * Source: PRONI 2024-2025, SEP
 */
export const PRONI_CONTENT_AREAS = [
  {
    id: 'familiarization',
    name: 'Familiarization with English',
    description: 'English sounds, rhythm, intonation patterns',
  },
  {
    id: 'vocabulary',
    name: 'Vocabulary development',
    description: 'Building word recognition through visuals and context',
  },
  {
    id: 'oral',
    name: 'Oral communication',
    description: 'Simple phrases, greetings, classroom language',
  },
  {
    id: 'written',
    name: 'Written language awareness',
    description: 'Letter recognition, awareness of print in English',
  },
  {
    id: 'cultural',
    name: 'Cultural awareness',
    description: 'English-speaking cultures, traditions, celebrations',
  },
  {
    id: 'multilingual',
    name: 'Multilingual identity',
    description: 'Pride in bilingualism, value of multiple languages',
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
