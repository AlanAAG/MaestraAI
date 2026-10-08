// Select official curriculum rows through the bounded, fallback-capable planner transport.
// An empty or failed selection stops generation before any ungrounded document is produced.
import { CONTENIDOS_FASE2_3, type ContenidoPDA } from './contenidos-fase2'
import { officialProcesos, type EnforceOptions } from './enforce-contenidos'

const SELECT_SYSTEM = `Eres una asistente pedagógica experta en el NEM (preescolar, Fase 2). Recibes el TEMA de un proyecto y una lista numerada de Contenidos oficiales de los 4 Campos Formativos. Devuelve ÚNICAMENTE un objeto JSON con la clave "indices", un arreglo con los ÍNDICES de los Contenidos que pueden trabajarse de forma AUTÉNTICA y DIRECTA a través de ese tema. No fuerces campos que no se relacionen con el tema: es preferible 2-3 campos pertinentes que los 4. Normalmente 4-8 contenidos. Responde SOLO el objeto, por ejemplo: {"indices":[0,3,12,18]}`

/** Numbered menu of every contenido (index-stable with CONTENIDOS_FASE2_3). */
export function buildContenidoMenu(): string {
  return CONTENIDOS_FASE2_3.map((c, i) => `${i}. [${c.campo}] ${c.contenido}`).join('\n')
}

/** Map model-returned indices → contenidos, dropping out-of-range/duplicate/non-integer entries. */
export function mapSelection(indices: unknown): ContenidoPDA[] {
  if (!Array.isArray(indices)) return []
  const seen = new Set<number>()
  const out: ContenidoPDA[] = []
  for (const raw of indices) {
    if (typeof raw !== 'number' && (typeof raw !== 'string' || !/^\d+$/.test(raw))) continue
    const i = Number(raw)
    if (Number.isInteger(i) && i >= 0 && i < CONTENIDOS_FASE2_3.length && !seen.has(i)) {
      seen.add(i)
      out.push(CONTENIDOS_FASE2_3[i])
    }
  }
  return out
}

/** Map teacher-selected contenido titles → verbatim bank rows (with full PDAs). Order-preserving,
 * dedup, unknown titles dropped. Used when the teacher explicitly picks contenidos per unit. */
export function contenidosFromTitles(titles: string[]): ContenidoPDA[] {
  const byTitle = new Map(CONTENIDOS_FASE2_3.map((c) => [c.contenido, c]))
  const seen = new Set<string>()
  const out: ContenidoPDA[] = []
  for (const t of titles) {
    const row = byTitle.get(t)
    if (row && !seen.has(t)) {
      seen.add(t)
      out.push(row)
    }
  }
  return out
}

/** The `<contenidos_sugeridos>` prompt block injected into the main quincena user prompt.
 * `opts` carries the grade (which PDA desglose) + the teacher's picked PDAs per contenido. */
export function contenidosSugeridosBlock(list: ContenidoPDA[], opts?: EnforceOptions): string {
  if (!list.length) return ''
  const byCampo = new Map<string, ContenidoPDA[]>()
  for (const c of list) {
    const arr = byCampo.get(c.campo) ?? []
    arr.push(c)
    byCampo.set(c.campo, arr)
  }
  const body = Array.from(byCampo.entries())
    .map(
      ([campo, items]) =>
        `CAMPO: ${campo}\n${items
          .map(
            (c) =>
              `  • Contenido: ${c.contenido}\n${officialProcesos(c, opts)
                .map((p) => `    - PDA: ${p}`)
                .join('\n')}`
          )
          .join('\n')}`
    )
    .join('\n\n')
  // Teacher-picked PDAs may come from another grade of Fase 2 — <contenidos_oficiales> only lists
  // her own grade's desglose, so say explicitly that these lines override it.
  const crossGrade = Object.keys(opts?.procesos ?? {}).length
    ? '\nLa maestra eligió estos PDA explícitamente; algunos pueden ser de otro grado de la Fase 2 (1°, 2° o 3°). Son oficiales y VÁLIDOS: usa EXACTAMENTE los PDA de esta lista, aunque no aparezcan en <contenidos_oficiales>.'
    : ''
  return `<contenidos_sugeridos>
Estos Contenidos y PDAs oficiales fueron PRE-SELECCIONADOS por su relación DIRECTA con el tema de este proyecto. Construye "campos_formativos" ÚNICAMENTE con estos campos y contenidos, copiándolos VERBATIM. NO agregues un campo que no aparezca aquí (en especial, NO incluyas un campo solo por completar los 4).${crossGrade}
${body}
</contenidos_sugeridos>`
}

/**
 * Shortlist only official rows relevant to the project. Provider and empty-selection failures
 * are surfaced to the caller; they must never trigger ungrounded free-form curriculum.
 */
export async function selectRelevantContenidos(
  topic: string,
  notes = '',
  hint: string[] = [],
  avoid: string[] = [],
  signal?: AbortSignal
): Promise<ContenidoPDA[]> {
  const t = `${topic} ${notes}`.trim()
  if (!t) return []
  try {
    // Lazy import so the pure helpers (and their tests) don't instantiate the Anthropic client.
    const { callPlannerJson } = await import('@/lib/planner/model')
    const hintLine = hint.length
      ? `LA MAESTRA SUELE TRABAJAR ESTOS CONTENIDOS (dales preferencia si son pertinentes al tema):\n${hint
          .slice(0, 12)
          .map((h) => `- ${h}`)
          .join('\n')}\n`
      : ''
    // Anti-repeat: recently-used contenidos. Relevance wins; only vary as a tie-breaker.
    const avoidLine = avoid.length
      ? `ESTOS CONTENIDOS SE USARON EN PLANEACIONES RECIENTES (si hay opciones IGUAL de pertinentes al tema, prefiere OTRAS para dar variedad; NUNCA sacrifiques la pertinencia):\n${avoid
          .slice(0, 15)
          .map((a) => `- ${a}`)
          .join('\n')}\n`
      : ''
    const result = await callPlannerJson<{ indices?: unknown }>(
      SELECT_SYSTEM,
      `TEMA DEL PROYECTO: ${topic}\n${notes ? `NOTAS: ${notes}\n` : ''}${hintLine}${avoidLine}\nCONTENIDOS DISPONIBLES:\n${buildContenidoMenu()}`,
      { maxTokens: 600, timeoutMs: 15000, signal, label: 'curriculum-selection' }
    )
    const rows = mapSelection(result.indices)
    if (!rows.length)
      throw new Error(
        'No se pudieron seleccionar contenidos oficiales pertinentes. Elige los contenidos de la unidad e intenta de nuevo.'
      )
    return rows
  } catch (error) {
    signal?.throwIfAborted()
    throw error
  }
}
