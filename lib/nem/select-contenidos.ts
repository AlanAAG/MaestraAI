// Topic-relevance pre-selection of official NEM Contenidos.
// The model used to free-pick from the full 35-contenido bank and was FORCED to fill all 4
// campos → it shoehorned an irrelevant "Saberes y Pensamiento Científico" into unrelated
// projects (Alejandra's #1 complaint). Here a cheap Haiku call shortlists the contenidos that
// can be worked AUTHENTICALLY through the project topic; the main prompt then builds
// campos_formativos from this list only. Best-effort: any failure → [] and the prompt falls
// back to its full-bank behavior.
// ponytail: 35 items → a Haiku shortlist, not embeddings/RAG. Upgrade to vectors only if a
// flat menu measurably underperforms.
import { CONTENIDOS_FASE2_3, type ContenidoPDA } from './contenidos-fase2'

const SELECT_SYSTEM = `Eres una asistente pedagógica experta en el NEM (preescolar, Fase 2). Recibes el TEMA de un proyecto y una lista numerada de Contenidos oficiales de los 4 Campos Formativos. Devuelve ÚNICAMENTE un arreglo JSON con los ÍNDICES de los Contenidos que pueden trabajarse de forma AUTÉNTICA y DIRECTA a través de ese tema. No fuerces campos que no se relacionen con el tema: es preferible 2-3 campos pertinentes que los 4. Normalmente 4-8 contenidos. Responde SOLO el arreglo, por ejemplo: [0,3,12,18]`

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
    const i = typeof raw === 'number' ? raw : Number(raw)
    if (Number.isInteger(i) && i >= 0 && i < CONTENIDOS_FASE2_3.length && !seen.has(i)) {
      seen.add(i)
      out.push(CONTENIDOS_FASE2_3[i])
    }
  }
  return out
}

/** The `<contenidos_sugeridos>` prompt block injected into the main quincena user prompt. */
export function contenidosSugeridosBlock(list: ContenidoPDA[]): string {
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
              `  • Contenido: ${c.contenido}\n${c.pdas3.map((p) => `    - PDA: ${p}`).join('\n')}`
          )
          .join('\n')}`
    )
    .join('\n\n')
  return `<contenidos_sugeridos>
Estos Contenidos y PDAs oficiales fueron PRE-SELECCIONADOS por su relación DIRECTA con el tema de este proyecto. Construye "campos_formativos" ÚNICAMENTE con estos campos y contenidos, copiándolos VERBATIM. NO agregues un campo que no aparezca aquí (en especial, NO incluyas un campo solo por completar los 4).
${body}
</contenidos_sugeridos>`
}

/**
 * Shortlist the contenidos relevant to a project topic. Best-effort — returns [] on any
 * failure (no key, bad JSON, empty topic) so the caller keeps the full-bank prompt behavior.
 */
export async function selectRelevantContenidos(
  topic: string,
  notes = '',
  hint: string[] = []
): Promise<ContenidoPDA[]> {
  const t = `${topic} ${notes}`.trim()
  if (!t) return []
  try {
    // Lazy import so the pure helpers (and their tests) don't instantiate the Anthropic client.
    const { streamToString } = await import('@/lib/claude')
    const hintLine = hint.length
      ? `LA MAESTRA SUELE TRABAJAR ESTOS CONTENIDOS (dales preferencia si son pertinentes al tema):\n${hint
          .slice(0, 12)
          .map((h) => `- ${h}`)
          .join('\n')}\n`
      : ''
    const raw = await streamToString(
      SELECT_SYSTEM,
      `TEMA DEL PROYECTO: ${topic}\n${notes ? `NOTAS: ${notes}\n` : ''}${hintLine}\nCONTENIDOS DISPONIBLES:\n${buildContenidoMenu()}`
    )
    const m = raw.match(/\[[\d,\s]*\]/)
    if (!m) return []
    return mapSelection(JSON.parse(m[0]))
  } catch {
    return []
  }
}
