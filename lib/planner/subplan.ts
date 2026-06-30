// Rich sub-plan (Letter & Number / Números) generation, shared by the inline pipeline
// (generate-document) and the on-demand route (generate-subplan).
import { callPlannerModel, parsePlanJson } from './model'

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
  pdaBank?: Array<{ campo: string; contenido: string; pdas: string[] }>,
  evalColumns: string[] = ['Logrado', 'En proceso', 'Requiere apoyo']
): string {
  const projectName = sanitize(fn.project_name)
  const monthlyValue = sanitize(fn.monthly_value)

  // Grounding is injected as a cached system prefix (see callPlannerModel cachePrefix), not here.
  const pdaCtx = pdaBank?.length
    ? `<pda_bank>\nUsa estos PDAs VERBATIM (no inventes otros):\n${pdaBank
        .map((p) => `${p.campo}: ${(p.pdas ?? []).join(' | ')}`)
        .join('\n')}\n</pda_bank>\n\n`
    : ''

  const depth = `EXIGENCIAS DE PROFUNDIDAD:
- "campos_formativos": 1-3 campos relevantes, cada contenido con 2-4 Procesos de Desarrollo de Aprendizaje (PDA) OFICIALES del Programa Fase 2 redactados VERBATIM (usa los del <pda_bank> si se proveen; no inventes otros).
- Cada momento de la estructura didáctica debe tener 4-8 actividades CONCRETAS y variadas (no genéricas).
- "evaluacion": 5 aspectos concretos. Columnas de evaluación: ${evalColumns.join(' / ')} (NUNCA numérica).
- Verbos en primera persona del singular. NO resumas, NO uses placeholders.`

  if (subType === 'letter_number') {
    const letter1 = sanitize(fn.letter_week1)
    const letter2 = sanitize(fn.letter_week2)
    return `${pdaCtx}Genera un sub-plan DETALLADO de LETTERS (Centro de Interés, para los ${letterDay}) dentro del proyecto "${projectName}" (valor del mes: ${monthlyValue}).
IMPORTANTE: Este sub-plan es EXCLUSIVAMENTE de LETRAS. NUNCA menciones números, conteo, rangos numéricos ni actividades numéricas — los números van en un sub-plan de Números aparte. Todo el contenido (nombre, momentos, evaluación) debe ser únicamente sobre letras.
Letras a trabajar: Semana 1="${letter1}", Semana 2="${letter2}"${vocabList ? `\nVocabulario inglés relacionado: ${vocabList}` : ''}
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

  return `${pdaCtx}Genera un sub-plan DETALLADO de NÚMEROS (Centro de Interés, para los ${numDay}) dentro del proyecto "${projectName}" (valor del mes: ${monthlyValue}).${vocabList ? `\nVocabulario inglés relacionado: ${vocabList}` : ''}

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

// Each NEM methodology has its own didactic structure (the keys + their human labels).
const METHODOLOGY_STRUCTURE: Record<string, { key: string; label: string }[]> = {
  'Centro de Interés': [
    { key: 'momento_1', label: '1° Momento: En contacto con la realidad' },
    { key: 'momento_2', label: '2° Momento: Identificación e integración' },
    { key: 'momento_3', label: '3° Momento: Expresión' },
  ],
  'Aprendizaje Basado en el Juego': [
    { key: 'momento_1', label: '1° Momento: Planteamiento del juego' },
    { key: 'momento_2', label: '2° Momento: Desarrollo de las actividades' },
    { key: 'momento_3', label: '3° Momento: Compartimos la experiencia' },
    { key: 'momento_4', label: '4° Momento: Comunidad de juego' },
  ],
  'Taller Crítico': [
    { key: 'situacion_inicial', label: 'Situación Inicial' },
    { key: 'organizacion', label: 'Organización de las Acciones (mesas/equipos, reglas)' },
    { key: 'puesta_en_marcha', label: 'Puesta en Marcha (días con fechas)' },
    { key: 'valoramos', label: 'Valoramos lo Aprendido' },
  ],
  Proyecto: [
    { key: 'punto_de_partida', label: 'Punto de Partida' },
    { key: 'planeacion', label: 'Planeación (incluye el friso)' },
    { key: 'a_trabajar', label: 'A trabajar (libros Richmond con páginas si aplica)' },
    { key: 'comunicamos', label: 'Comunicamos Nuestros Logros' },
    { key: 'reflexion', label: 'Reflexión sobre el aprendizaje' },
  ],
  'Situación Didáctica': [
    { key: 'inicio', label: 'Inicio' },
    { key: 'desarrollo', label: 'Desarrollo' },
    { key: 'cierre', label: 'Cierre' },
  ],
  Asamblea: [
    { key: 'inicio', label: 'Inicio' },
    { key: 'desarrollo', label: 'Desarrollo' },
    { key: 'cierre', label: 'Cierre' },
  ],
}

// Generate a sub-planeación of ANY NEM methodology (Taller, ABJ, etc.), teacher-driven.
export async function generateCustomSubplan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any,
  spec: { methodology: string; name: string; notes?: string },
  opts: {
    evalColumns?: string[]
    pdaBank?: Array<{ campo: string; contenido: string; pdas: string[] }>
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
  const pdaCtx = opts.pdaBank?.length
    ? `<pda_bank>\nUsa estos PDAs VERBATIM (no inventes otros):\n${opts.pdaBank
        .map((p) => `${p.campo}: ${(p.pdas ?? []).join(' | ')}`)
        .join('\n')}\n</pda_bank>\n\n`
    : ''

  const prompt = `${pdaCtx}Genera una sub-planeación DETALLADA de metodología "${spec.methodology}" titulada "${spec.name}", dentro del proyecto "${sanitize(fn.project_name)}" (valor del mes: ${sanitize(fn.monthly_value)}).
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

Reglas: 1-3 campos formativos con PDAs oficiales verbatim. 4-6 aspectos de evaluación (columnas: ${evalCols.join(' / ')}, NUNCA numérica). Cada sección con actividades concretas y variadas. NO escribas la palabra "markdown" en el contenido.`

  const raw = await callPlannerModel(SUBPLAN_SYSTEM, prompt, {
    maxTokens: 6000,
    cachePrefix: opts.cachePrefix,
  })
  return parsePlanJson(raw)
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
    pdaBank?: Array<{ campo: string; contenido: string; pdas: string[] }>
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
    opts.pdaBank,
    opts.evalColumns
  )
  const raw = await callPlannerModel(SUBPLAN_SYSTEM, prompt, {
    maxTokens: 6000,
    cachePrefix: opts.cachePrefix,
  })
  return parsePlanJson(raw)
}
