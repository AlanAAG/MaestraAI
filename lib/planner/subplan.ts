// Rich sub-plan (Letters / Números) generation, shared by the inline pipeline
// (generate-document) and the on-demand route (generate-subplan).
import { generateCheckedPart } from './generate-parts'
import { normalizePlanDocument, sectionToString } from './normalize-document'
import { enfoqueBlock } from './enfoques'
import { contenidosFromTitles, contenidosSugeridosBlock } from '@/lib/nem/select-contenidos'
import { enforceCamposFormativos, matchContenido } from '@/lib/nem/enforce-contenidos'
import { METHODOLOGY_STRUCTURE } from './methodologies'

export const SUBPLAN_SYSTEM = `Eres una asistente pedagógica experta en educación preescolar mexicana alineada al NEM 2024. Generas sub-planeaciones DETALLADAS para actividades específicas (Letters / Números) dentro de una quincena, con la riqueza de una maestra titular experta. Tu respuesta es ÚNICAMENTE un objeto JSON válido sin texto adicional. Desarrolla cada momento con MÚLTIPLES actividades concretas — nunca contenido genérico o resumido.`

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
- "campos_formativos": 1-3 campos relevantes, elegidos de <contenidos_oficiales>. Cada contenido elegido con TODOS sus Procesos de Desarrollo de Aprendizaje (PDA) oficiales tal como aparecen en <contenidos_oficiales> (el desglose del grado del grupo), VERBATIM — el desglose completo (mismo número, mismo orden, sin consolidar ni omitir). PDA = Proceso de Desarrollo de Aprendizaje; NUNCA escribas "aprendizajes esperados".
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

${String(fn.__attachRagLetters ?? '')}
${enfoqueBlock(fn.pedagogical_approach)}
Reglas: Letters es SOLO los ${letterDay}. SOLO letras, sin contenido numérico. NUNCA escribas "PRONI" ni combines Letters con Números en el nombre o los títulos. Evaluación cualitativa, nunca numérica.
${depth}`
  }

  const isMonthNum = !!fn.is_month || fn.plan_type === 'mes'
  // Teacher-declared numbers per week (migration 072). Empty → the model picks the progression.
  const numberWeeks = [
    sanitize(fn.number_week1),
    sanitize(fn.number_week2),
    ...(isMonthNum ? [sanitize(fn.number_week3), sanitize(fn.number_week4)] : []),
  ]
  const numbersLine = numberWeeks.some(Boolean)
    ? `\nNÚMEROS A TRABAJAR (OBLIGATORIO, usa EXACTAMENTE estos):\n${numberWeeks
        .map((n, i) => (n ? `Semana ${i + 1}: ${n}` : `Semana ${i + 1}: (continúa la progresión)`))
        .join('\n')}`
    : ''
  return `Genera un sub-plan DETALLADO de NÚMEROS (Centro de Interés, para los ${numDay}) dentro del proyecto "${projectName}" (valor del mes: ${monthlyValue}).${isMonthNum ? '\nEste sub-plan cubre UN MES COMPLETO (4 semanas): amplía el rango numérico con progresión semana a semana.' : ''}${numbersLine}${vocabList ? `\nVocabulario inglés relacionado: ${vocabList}` : ''}

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

${String(fn.__attachRagNumeros ?? '')}
${enfoqueBlock(fn.pedagogical_approach)}
Reglas: Números es SOLO los ${numDay}. NUNCA escribas "PRONI" ni combines Números con Letters en el nombre o los títulos. Evaluación cualitativa, nunca numérica.
${depth}`
}

// Methodology structures live in ./methodologies (leaf module — lib/nem/grounding also uses it
// without creating an import cycle). Re-exported here for existing importers.
export { METHODOLOGY_STRUCTURE, buildEstructuraProyectoBlock } from './methodologies'

/** Each requested momento must exist; one long opening cannot stand in for the whole sub-plan. */
export function missingSubplanFields(doc: Record<string, unknown>, moments: string[]): string[] {
  const missing: string[] = []
  const structure = doc.estructura_didactica as Record<string, unknown> | undefined
  if (!structure || moments.some((key) => sectionToString(structure[key]).trim().length < 80))
    missing.push('estructura_didactica')
  if (
    !Array.isArray(doc.evaluacion) ||
    doc.evaluacion.filter(
      (item) => typeof item?.aspecto === 'string' && item.aspecto.trim().length > 10
    ).length < 4
  )
    missing.push('evaluacion')
  if (
    !Array.isArray(doc.campos_formativos) ||
    !doc.campos_formativos.some(
      (campo) =>
        Array.isArray(campo?.contenidos) &&
        campo.contenidos.some((item: { contenido?: string }) =>
          matchContenido(item?.contenido ?? '')
        )
    )
  )
    missing.push('campos_formativos')
  return missing
}

type UnitSpec = {
  metodologia: string
  nombre?: string
  tema?: string
  dias?: string
  libros?: string
  contenidos?: string[]
  procesos?: Record<string, string[]>
  ejes?: string[]
}

export function additionalUnits(
  explicit: UnitSpec[] | null | undefined,
  inventory: UnitSpec[] = []
): UnitSpec[] {
  if (explicit?.length) return explicit.slice(1).filter((unit) => unit?.metodologia?.trim())
  // The template's main Proyecto is generated above. Named Letters/Números have dedicated calls.
  const mainIndex = inventory.findIndex((unit) => /proyecto/i.test(unit?.metodologia ?? ''))
  return inventory.filter(
    (unit, index) =>
      index !== mainIndex &&
      unit?.metodologia?.trim() &&
      !/letters?|letras|n[uú]meros|numbers?/i.test(unit.nombre ?? '')
  )
}

async function generateCompleteSubplan(
  system: string,
  prompt: string,
  opts: {
    moments: string[]
    contenidos?: string[]
    procesos?: Record<string, string[]>
    grade?: string
    cachePrefix?: string
    label: string
    signal?: AbortSignal
  }
): Promise<Record<string, unknown>> {
  const selectedRows = opts.contenidos?.length ? contenidosFromTitles(opts.contenidos) : []
  if (opts.contenidos?.length && !selectedRows.length)
    throw new Error(
      'No se reconocieron los contenidos oficiales de esta unidad. Revisa la selección.'
    )
  const fixedCampos = selectedRows.length
    ? enforceCamposFormativos(
        selectedRows.map((row) => ({
          campo: row.campo,
          contenidos: [{ contenido: row.contenido }],
        })),
        { grade: opts.grade, procesos: opts.procesos }
      )
    : null
  const doc = await generateCheckedPart(
    system,
    prompt +
      '\n\n' +
      contenidosSugeridosBlock(selectedRows, { grade: opts.grade, procesos: opts.procesos }),
    {
      keys: [
        'nombre',
        'estructura_didactica',
        'evaluacion',
        ...(fixedCampos ? [] : ['campos_formativos']),
      ],
      maxTokens: 12000,
      cachePrefix: opts.cachePrefix,
      label: opts.label,
      signal: opts.signal,
      validate: (candidate) => [
        ...missingSubplanFields(
          {
            ...candidate,
            campos_formativos:
              fixedCampos ??
              enforceCamposFormativos(candidate.campos_formativos, {
                grade: opts.grade,
                procesos: opts.procesos,
              }),
          },
          opts.moments
        ),
        ...(typeof candidate.nombre !== 'string' || !candidate.nombre.trim() ? ['nombre'] : []),
      ],
    }
  )
  doc.campos_formativos =
    fixedCampos ??
    enforceCamposFormativos(doc.campos_formativos, { grade: opts.grade, procesos: opts.procesos })
  return normalizePlanDocument({ sub_planes: [doc] }).sub_planes[0]
}

// Generate a sub-planeación of ANY NEM methodology (Taller, ABJ, etc.), teacher-driven.
export async function generateCustomSubplan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any,
  spec: {
    methodology: string
    name: string
    notes?: string
    contenidos?: string[]
    procesos?: Record<string, string[]>
    ejes?: string[]
  },
  opts: {
    evalColumns?: string[]
    cachePrefix?: string
    /** Attachment-RAG fragments relevant to THIS unit (query = its name+tema). */
    ragBlock?: string
    signal?: AbortSignal
  } = {}
): Promise<Record<string, unknown>> {
  const struct =
    METHODOLOGY_STRUCTURE[spec.methodology] ?? METHODOLOGY_STRUCTURE['Situación Didáctica']
  const estructuraJson = struct
    .map(
      (s) =>
        `    "${s.key}": "4-8 actividades concretas de ${s.label} en viñetas \"- \" (una por línea, una idea por viñeta), primera persona singular. NO repitas el nombre del momento dentro del texto: el encabezado ya lo dice."`
    )
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

${opts.ragBlock ?? ''}
${spec.ejes?.length ? `Ejes elegidos para ESTA unidad: ${spec.ejes.join(', ')}` : ''}
${enfoqueBlock(fn.pedagogical_approach)}
Reglas: 1-3 campos formativos elegidos de <contenidos_oficiales>, cada contenido con TODOS sus PDA oficiales VERBATIM (desglose completo, sin consolidar ni omitir). 4-6 aspectos de evaluación (columnas: ${evalCols.join(' / ')}, NUNCA numérica). Cada sección con actividades concretas y variadas. NO escribas la palabra "markdown" en el contenido.`

  const doc = await generateCompleteSubplan(SUBPLAN_SYSTEM, prompt, {
    moments: struct.map((moment) => moment.key),
    contenidos: spec.contenidos,
    procesos: spec.procesos,
    grade: fn._grade,
    cachePrefix: opts.cachePrefix,
    label: spec.name,
    signal: opts.signal,
  })
  return { ...doc, tipo: 'custom', metodologia: spec.methodology, nombre: spec.name }
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
    signal?: AbortSignal
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
  const doc = await generateCompleteSubplan(SUBPLAN_SYSTEM, prompt, {
    moments: ['momento_1', 'momento_2', 'momento_3'],
    grade: fn._grade,
    cachePrefix: opts.cachePrefix,
    label: subType === 'numeros' ? 'Números' : 'Letters',
    signal: opts.signal,
  })
  return { ...doc, tipo: subType, metodologia: 'Centro de Interés' }
}
