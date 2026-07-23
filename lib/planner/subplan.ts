// Rich sub-plan (Letter & Number / Números) generation, shared by the inline pipeline
// (generate-document) and the on-demand route (generate-subplan).
import { callPlannerModel, parsePlanJson } from './model'
import { enforceCamposFormativos } from '@/lib/nem/enforce-contenidos'
import { METHODOLOGY_STRUCTURE } from './methodologies'

export const SUBPLAN_SYSTEM = `Eres una asistente pedagógica experta en educación preescolar mexicana alineada al NEM 2024. Generas sub-planeaciones DETALLADAS para actividades específicas (Letter & Number / Números) dentro de una quincena, con la riqueza de una maestra titular experta. Tu respuesta es ÚNICAMENTE un objeto JSON válido sin texto adicional. Desarrolla cada momento con MÚLTIPLES actividades concretas — nunca contenido genérico o resumido.`

const sanitize = (s: string | null | undefined) => (s || '').replace(/[\r\n]/g, ' ').slice(0, 200)

export function buildSubplanPrompt(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any,
  subType: 'letter_number' | 'numeros',
  vocabList: string,
  letterDay: string,
  numDay: string,
  includeProni: boolean,
  evalColumns: string[] = ['Logrado', 'En proceso', 'Requiere apoyo']
): string {
  const projectName = sanitize(fn.project_name)
  const monthlyValue = sanitize(fn.monthly_value)

  // Grounding (the FULL official Contenido/PDA bank) is injected as a cached system prefix
  // (see callPlannerModel cachePrefix), not here — the official bank is the ONLY PDA source.
  const depth = `EXIGENCIAS DE PROFUNDIDAD:
- "campos_formativos": 1-3 campos relevantes, elegidos de <contenidos_oficiales>. Cada contenido elegido con TODOS sus Procesos de Desarrollo de Aprendizaje (PDA) oficiales de 3er grado, VERBATIM — el desglose completo (mismo número, mismo orden, sin consolidar ni omitir). PDA = Proceso de Desarrollo de Aprendizaje; NUNCA escribas "aprendizajes esperados".
- Cada momento de la estructura didáctica debe tener 4-8 actividades CONCRETAS y variadas (no genéricas).
- "evaluacion": 5 aspectos concretos. Columnas de evaluación: ${evalColumns.join(' / ')} (NUNCA numérica).
- Verbos en primera persona del singular. NO resumas, NO uses placeholders.`

  if (subType === 'letter_number') {
    // Month plans (is_month) span 4 weeks of letters; quincena spans 2.
    const isMonth = !!fn.is_month || fn.plan_type === 'mes'
    const weekLetters = [
      sanitize(fn.letter_week1),
      sanitize(fn.letter_week2),
      ...(isMonth ? [sanitize(fn.letter_week3), sanitize(fn.letter_week4)] : []),
    ]
    const lettersList = weekLetters.map((l, i) => `Semana ${i + 1}="${l}"`).join(', ')
    const monthNote = isMonth
      ? '\nEste Centro de Interés cubre UN MES COMPLETO (4 semanas): trabaja las 4 letras con progresión semana a semana.'
      : ''
    return `Genera un sub-plan DETALLADO de LETTERS (Centro de Interés, para los ${letterDay}) dentro del proyecto "${projectName}" (valor del mes: ${monthlyValue}).
IMPORTANTE: Este sub-plan es EXCLUSIVAMENTE de LETRAS. NUNCA menciones números, conteo, rangos numéricos ni actividades numéricas — los números van en un sub-plan de Números aparte. Todo el contenido (nombre, momentos, evaluación) debe ser únicamente sobre letras.
Letras a trabajar: ${lettersList}${monthNote}${vocabList ? `\nVocabulario inglés relacionado: ${vocabList}` : ''}
${includeProni ? 'PRONI (Kinder 3): integra inglés — trazo de letras, vocabulario, canciones, identidad multilingüe.' : ''}

Formato de salida JSON:
{
  "tipo": "letter_number",
  "metodologia": "Centro de Interés",
  "nombre": "Nombre descriptivo de la actividad con las letras (p. ej. 'Conozcamos las letras')",
  "campos_formativos": [{"campo": "Lenguajes", "contenidos": [{"contenido": "Contenido NEM Fase 2", "procesos": ["PDA oficial verbatim 1", "PDA oficial verbatim 2"]}]}],
  "estructura_didactica": {
    "momento_1": "1° Momento: En contacto con la realidad. Cómo presento la letra, qué conocimientos previos activo, búsqueda en el alfabeto, investigación con nombres/objetos.",
    "momento_2": "2° Momento: Identificación e integración. MÚLTIPLES actividades de trazo (pizarrón mágico, crema de afeitar, agujetas, fichas), canciones, sopa de letras, búsqueda en cuentos, tarjetas LETTERS, plastilina, flashcards de vocabulario.",
    "momento_3": "3° Momento: Expresión. Modelado con plastilina, exposición de trabajos, cierre cantando/bailando la canción de la letra."
  },
  "evaluacion": [{"aspecto": "Escribe la letra Xx"}, {"aspecto": "Reconoce la letra Xx"}, {"aspecto": "Reconoce y escribe palabras que comienzan con Xx"}, {"aspecto": "Modela letras y palabras con plastilina"}, {"aspecto": "Trabaja y juega respetando reglas de convivencia"}]
}

Reglas: Letters es SOLO los ${letterDay}. SOLO letras, sin contenido numérico. Evaluación cualitativa, nunca numérica.
${depth}`
  }

  const isMonthNum = !!fn.is_month || fn.plan_type === 'mes'
  return `Genera un sub-plan DETALLADO de NÚMEROS (Centro de Interés, para los ${numDay}) dentro del proyecto "${projectName}" (valor del mes: ${monthlyValue}).${isMonthNum ? '\nEste sub-plan cubre UN MES COMPLETO (4 semanas): amplía el rango numérico con progresión semana a semana.' : ''}${vocabList ? `\nVocabulario inglés relacionado: ${vocabList}` : ''}

Formato de salida JSON:
{
  "tipo": "numeros",
  "metodologia": "Centro de Interés",
  "nombre": "Nombre descriptivo del rango numérico que se trabaja (p. ej. 'Los Fifty's')",
  "campos_formativos": [{"campo": "Saberes y Pensamiento Científico", "contenidos": [{"contenido": "Contenido NEM Fase 2", "procesos": ["PDA oficial verbatim 1", "PDA oficial verbatim 2"]}]}],
  "estructura_didactica": {
    "momento_1": "1° Momento: En contacto con la realidad. Introducción al rango numérico, conocimientos previos, canción de los números en inglés.",
    "momento_2": "2° Momento: Identificación e integración. MÚLTIPLES actividades: tarjetas y tableros con vasos, conteo, pares número-nombre en inglés, ordenar, torres de fichas, trazo en pizarrón.",
    "momento_3": "3° Momento: Expresión. Modelado de números con plastilina, identificación en desorden, cierre con canción."
  },
  "evaluacion": [{"aspecto": "Reconoce los números del rango trabajado"}, {"aspecto": "Traza los números del rango"}, {"aspecto": "Cuenta objetos del rango"}, {"aspecto": "Construye colecciones"}, {"aspecto": "Trabaja y juega respetando reglas de convivencia"}]
}

Reglas: Números es SOLO los ${numDay}. Evaluación cualitativa, nunca numérica.
${depth}`
}

// Methodology structures live in ./methodologies (leaf module — lib/nem/grounding also uses it
// without creating an import cycle). Re-exported here for existing importers.
export { METHODOLOGY_STRUCTURE, buildEstructuraProyectoBlock } from './methodologies'

// Generate a sub-planeación of ANY NEM methodology (Taller, ABJ, etc.), teacher-driven.
export async function generateCustomSubplan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any,
  spec: { methodology: string; name: string; notes?: string },
  opts: {
    evalColumns?: string[]
    cachePrefix?: string
  } = {}
): Promise<Record<string, unknown>> {
  const struct =
    METHODOLOGY_STRUCTURE[spec.methodology] ?? METHODOLOGY_STRUCTURE['Situación Didáctica']
  const estructuraJson = struct
    .map((s) => `    "${s.key}": "${s.label}: 4-8 actividades concretas, primera persona singular"`)
    .join(',\n')
  const evalCols = opts.evalColumns?.length
    ? opts.evalColumns
    : ['Logrado', 'En proceso', 'Requiere apoyo']

  const prompt = `Genera una sub-planeación DETALLADA de metodología "${spec.methodology}" titulada "${spec.name}", dentro del proyecto "${sanitize(fn.project_name)}" (valor del mes: ${sanitize(fn.monthly_value)}).
${spec.notes ? `Indicaciones específicas de la maestra: ${sanitize(spec.notes)}` : ''}

Formato de salida JSON (responde SOLO el objeto):
{
  "tipo": "custom",
  "metodologia": "${spec.methodology}",
  "nombre": "${spec.name}",
  "campos_formativos": [{"campo": "Lenguajes", "contenidos": [{"contenido": "Contenido NEM Fase 2", "procesos": ["PDA oficial verbatim"]}]}],
  "estructura_didactica": {
${estructuraJson}
  },
  "evaluacion": [{"aspecto": "..."}, {"aspecto": "..."}],
  "observaciones": ""
}

Reglas: 1-3 campos formativos elegidos de <contenidos_oficiales>, cada contenido con TODOS sus PDA oficiales VERBATIM (desglose completo, sin consolidar ni omitir). 4-6 aspectos de evaluación (columnas: ${evalCols.join(' / ')}, NUNCA numérica). Cada sección con actividades concretas y variadas. NO escribas la palabra "markdown" en el contenido.`

  const raw = await callPlannerModel(SUBPLAN_SYSTEM, prompt, {
    maxTokens: 8000, // Sonnet 5 tokenizer ~30% fatter — 6000 risked truncating rich sub-plans
    cachePrefix: opts.cachePrefix,
  })
  const doc = parsePlanJson(raw)
  doc.campos_formativos = enforceCamposFormativos(doc.campos_formativos)
  return doc
}

export async function generateSubplan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any,
  subType: 'letter_number' | 'numeros',
  opts: {
    vocabList: string
    letterDay: string
    numDay: string
    includeProni: boolean
    evalColumns?: string[]
    cachePrefix?: string
  }
): Promise<Record<string, unknown>> {
  const prompt = buildSubplanPrompt(
    fn,
    subType,
    opts.vocabList,
    opts.letterDay,
    opts.numDay,
    opts.includeProni,
    opts.evalColumns
  )
  const raw = await callPlannerModel(SUBPLAN_SYSTEM, prompt, {
    maxTokens: 8000, // Sonnet 5 tokenizer ~30% fatter — 6000 risked truncating rich sub-plans
    cachePrefix: opts.cachePrefix,
  })
  const doc = parsePlanJson(raw)
  doc.campos_formativos = enforceCamposFormativos(doc.campos_formativos)
  return doc
}
