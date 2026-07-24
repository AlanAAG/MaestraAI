// Smart auto-fill for the NEM pedagogical dropdowns when the teacher leaves them blank.
// Goal: pick a metodología + ejes articuladores that FIT the project topic first, and — only as a
// tie-breaker — prefer options not used in the teacher's recent planeaciones (variety without
// forcing an ill-fitting choice). Contenidos have their own topic-relevance selector
// (selectRelevantContenidos); this covers metodología + ejes and feeds the anti-repeat hints.
// Everything is best-effort: any failure returns {} and the caller keeps the prior behavior.
import { EJES_ARTICULADORES } from '@/lib/nem-official-data'
import { METHODOLOGY_STRUCTURE } from './methodologies'

// Valid methodology picks (exclude the generic 3-moment "Asamblea" placeholder).
export const METODOLOGIAS_VALIDAS = Object.keys(METHODOLOGY_STRUCTURE).filter(
  (k) => k !== 'Asamblea'
)

export type RecentChoices = { metodologias: string[]; ejes: string[]; contenidos: string[] }

/** Pure: the pedagogical choices used across recent plans' unidades_didacticas (deduped). */
export function extractRecentChoices(recentUnits: unknown[]): RecentChoices {
  const metodologias = new Set<string>()
  const ejes = new Set<string>()
  const contenidos = new Set<string>()
  for (const raw of recentUnits) {
    const u = raw as { metodologia?: unknown; ejes?: unknown; contenidos?: unknown }
    if (typeof u?.metodologia === 'string' && u.metodologia && u.metodologia !== 'Automático') {
      metodologias.add(u.metodologia)
    }
    if (Array.isArray(u?.ejes)) for (const e of u.ejes) if (typeof e === 'string') ejes.add(e)
    if (Array.isArray(u?.contenidos))
      for (const c of u.contenidos) if (typeof c === 'string') contenidos.add(c)
  }
  return {
    metodologias: Array.from(metodologias),
    ejes: Array.from(ejes),
    contenidos: Array.from(contenidos),
  }
}

const SYSTEM = `Eres una asistente pedagógica experta en el NEM (preescolar, Fase 2). Eliges opciones oficiales que se ajusten al tema del proyecto. Devuelves SOLO un objeto JSON con las claves solicitadas y valores EXACTOS de las listas dadas (sin inventar).`

/**
 * Auto-pick a fitting metodología and/or 2-3 ejes for a project topic. Relevance first; recent
 * choices are only a tie-breaker toward variety. Best-effort → {} on any failure.
 */
export async function autoSelectNem(
  topic: string,
  notes: string,
  recent: RecentChoices,
  need: { metodologia: boolean; ejes: boolean }
): Promise<{ metodologia?: string; ejes?: string[] }> {
  if (!need.metodologia && !need.ejes) return {}
  const t = `${topic} ${notes}`.trim()
  if (!t) return {}
  try {
    // Lazy import so the pure helpers (and their tests) don't instantiate the Anthropic client.
    const { streamToString } = await import('@/lib/claude')
    const asks: string[] = []
    if (need.metodologia)
      asks.push(
        `- "metodologia": UNA de esta lista, la que MEJOR se ajuste al tema: ${METODOLOGIAS_VALIDAS.join(' | ')}. Prioriza el ajuste pedagógico al tema; SOLO como desempate, prefiere una distinta de las usadas recientemente${recent.metodologias.length ? ` (recientes: ${recent.metodologias.join(', ')})` : ''}.`
      )
    if (need.ejes)
      asks.push(
        `- "ejes": 2-3 de estos 7 ejes articuladores, los más relacionados con el tema: ${[...EJES_ARTICULADORES].join(' | ')}. Prioriza pertinencia; SOLO como desempate, prefiere ejes distintos de los usados recientemente${recent.ejes.length ? ` (recientes: ${recent.ejes.join(', ')})` : ''}.`
      )
    const raw = await streamToString(
      SYSTEM,
      `TEMA DEL PROYECTO: ${topic}\n${notes ? `NOTAS: ${notes}\n` : ''}\nElige:\n${asks.join('\n')}\n\nResponde SOLO el JSON, por ejemplo: {"metodologia":"Proyecto","ejes":["Inclusión","Vida saludable"]}`
    )
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return {}
    const parsed = JSON.parse(m[0]) as { metodologia?: unknown; ejes?: unknown }
    const out: { metodologia?: string; ejes?: string[] } = {}
    if (
      need.metodologia &&
      typeof parsed.metodologia === 'string' &&
      METODOLOGIAS_VALIDAS.includes(parsed.metodologia)
    ) {
      out.metodologia = parsed.metodologia
    }
    if (need.ejes && Array.isArray(parsed.ejes)) {
      const valid = EJES_ARTICULADORES as readonly string[]
      out.ejes = parsed.ejes
        .filter((e): e is string => typeof e === 'string' && valid.includes(e))
        .slice(0, 3)
    }
    return out
  } catch {
    return {}
  }
}
