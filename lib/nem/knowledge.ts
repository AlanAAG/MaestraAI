// NEM knowledge retrieval (migration 066): embeds the plan topic and pulls the most relevant
// EXACT passages from the institutional corpus (context/*.md, ingested via
// scripts/ingest-nem-knowledge.mjs). COMPLEMENTS the always-on NEM_SYNTHESIS + grounding block
// (exactness layer) with long-tail knowledge. All calls degrade gracefully — no OPENAI_API_KEY,
// migration not pushed, corpus not ingested, any error → [] / '' and generation proceeds.
import { embed } from '@/lib/planner/embeddings'

export type NemKnowledgeChunk = {
  id: string
  source: string
  heading_path: string | null
  content: string
  similarity: number
}

// pgvector accepts the array literal as text — stringify so it casts cleanly via PostgREST.
const toVector = (v: number[]) => JSON.stringify(v)

export async function matchNemKnowledge(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  queryText: string,
  k: number = 6
): Promise<NemKnowledgeChunk[]> {
  const vec = await embed(queryText)
  if (!vec) return []
  try {
    const { data, error } = await supabase.rpc('match_nem_knowledge', {
      query_embedding: toVector(vec),
      match_count: k,
    })
    if (error) return []
    return (data ?? []) as NemKnowledgeChunk[]
  } catch {
    return []
  }
}

// Human-readable source labels for the prompt ("Según [Evaluación formativa, '…']").
const SOURCE_LABELS: Record<string, string> = {
  'Evaluacion-Formativa-Fase2.md': 'Evaluación Formativa Fase 2 (SEP)',
  'PRONI_2024-2025.md': 'PRONI 2024-2025 (SEP)',
  'Plan-de-Estudio-2022.md': 'Plan de Estudio 2022 (SEP)',
  'Programa_sintetico_fase_2.md': 'Programa Sintético Fase 2 (SEP)',
}

const MAX_BLOCK_CHARS = 6000

// The prompt block injected into generation (query-dependent — NOT part of the cachePrefix).
export function nemKnowledgeBlock(chunks: NemKnowledgeChunk[]): string {
  if (!chunks.length) return ''
  const parts: string[] = []
  let used = 0
  for (const c of chunks) {
    const label = SOURCE_LABELS[c.source] ?? c.source
    const where = c.heading_path ? `, "${c.heading_path}"` : ''
    const entry = `Según [${label}${where}]:\n${(c.content || '').trim()}`
    if (used + entry.length > MAX_BLOCK_CHARS) break
    parts.push(entry)
    used += entry.length + 2
  }
  if (!parts.length) return ''
  return `<conocimiento_nem>\nPasajes EXACTOS de los documentos oficiales de la NEM más relevantes para esta planeación. Cuando apliquen, fundamenta la planeación en ellos (metodología, evaluación formativa, PRONI) y NUNCA los contradigas:\n\n${parts.join('\n\n')}\n</conocimiento_nem>`
}
