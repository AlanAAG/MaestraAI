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
  includeProni: boolean
): string {
  const projectName = sanitize(fn.project_name)
  const monthlyValue = sanitize(fn.monthly_value)

  const depth = `EXIGENCIAS DE PROFUNDIDAD:
- "campos_formativos": 1-3 campos relevantes, cada contenido con 2-4 Procesos de Desarrollo de Aprendizaje (PDA) OFICIALES del Programa Fase 2 redactados VERBATIM (no inventados).
- Cada momento de la estructura didáctica debe tener 4-8 actividades CONCRETAS y variadas (no genéricas).
- "evaluacion": 5 aspectos concretos.
- Verbos en primera persona del singular. NO resumas, NO uses placeholders.`

  if (subType === 'letter_number') {
    const letter1 = sanitize(fn.letter_week1)
    const letter2 = sanitize(fn.letter_week2)
    return `Genera un sub-plan DETALLADO de LETTER & NUMBER (Centro de Interés, para los ${letterDay}) dentro del proyecto "${projectName}" (valor del mes: ${monthlyValue}).
Letras a trabajar: Semana 1="${letter1}", Semana 2="${letter2}"${vocabList ? `\nVocabulario inglés relacionado: ${vocabList}` : ''}
${includeProni ? 'PRONI (Kinder 3): integra inglés — trazo, vocabulario, canciones, identidad multilingüe.' : ''}

Formato de salida JSON:
{
  "tipo": "letter_number",
  "metodologia": "Centro de Interés",
  "nombre": "Nombre descriptivo de la actividad con las letras (p. ej. 'Conozcamos las letras')",
  "campos_formativos": [{"campo": "Lenguajes", "contenidos": [{"contenido": "Contenido NEM Fase 2", "procesos": ["PDA oficial verbatim 1", "PDA oficial verbatim 2"]}]}],
  "estructura_didactica": {
    "momento_1": "markdown — 1° Momento: En contacto con la realidad. Cómo presento la letra, qué conocimientos previos activo, búsqueda en el alfabeto, investigación con nombres/objetos.",
    "momento_2": "markdown — 2° Momento: Identificación e integración. MÚLTIPLES actividades de trazo (pizarrón mágico, crema de afeitar, agujetas, fichas), canciones, sopa de letras, búsqueda en cuentos, tarjetas LETTERS, plastilina, flashcards de vocabulario.",
    "momento_3": "markdown — 3° Momento: Expresión. Modelado con plastilina, exposición de trabajos, cierre cantando/bailando la canción de la letra."
  },
  "evaluacion": [{"aspecto": "Escribe la letra Xx"}, {"aspecto": "Reconoce la letra Xx"}, {"aspecto": "Reconoce y escribe palabras que comienzan con Xx"}, {"aspecto": "Modela letras y palabras con plastilina"}, {"aspecto": "Trabaja y juega respetando reglas de convivencia"}]
}

Reglas: Letter & Number es SOLO los ${letterDay}. Evaluación cualitativa (Logrado/En proceso/Requiere apoyo), nunca numérica.
${depth}`
  }

  return `Genera un sub-plan DETALLADO de NÚMEROS (Centro de Interés, para los ${numDay}) dentro del proyecto "${projectName}" (valor del mes: ${monthlyValue}).${vocabList ? `\nVocabulario inglés relacionado: ${vocabList}` : ''}

Formato de salida JSON:
{
  "tipo": "numeros",
  "metodologia": "Centro de Interés",
  "nombre": "Nombre descriptivo del rango numérico que se trabaja (p. ej. 'Los Fifty's')",
  "campos_formativos": [{"campo": "Saberes y Pensamiento Científico", "contenidos": [{"contenido": "Contenido NEM Fase 2", "procesos": ["PDA oficial verbatim 1", "PDA oficial verbatim 2"]}]}],
  "estructura_didactica": {
    "momento_1": "markdown — 1° Momento: En contacto con la realidad. Introducción al rango numérico, conocimientos previos, canción de los números en inglés.",
    "momento_2": "markdown — 2° Momento: Identificación e integración. MÚLTIPLES actividades: tarjetas y tableros con vasos, conteo, pares número-nombre en inglés, ordenar, torres de fichas, trazo en pizarrón.",
    "momento_3": "markdown — 3° Momento: Expresión. Modelado de números con plastilina, identificación en desorden, cierre con canción."
  },
  "evaluacion": [{"aspecto": "Reconoce los números del rango trabajado"}, {"aspecto": "Traza los números del rango"}, {"aspecto": "Cuenta objetos del rango"}, {"aspecto": "Construye colecciones"}, {"aspecto": "Trabaja y juega respetando reglas de convivencia"}]
}

Reglas: Números es SOLO los ${numDay}. Evaluación cualitativa, nunca numérica.
${depth}`
}

export async function generateSubplan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: any,
  subType: 'letter_number' | 'numeros',
  opts: { vocabList: string; letterDay: string; numDay: string; includeProni: boolean }
): Promise<Record<string, unknown>> {
  const prompt = buildSubplanPrompt(
    fn,
    subType,
    opts.vocabList,
    opts.letterDay,
    opts.numDay,
    opts.includeProni
  )
  const raw = await callPlannerModel(SUBPLAN_SYSTEM, prompt, { maxTokens: 6000 })
  return parsePlanJson(raw)
}
