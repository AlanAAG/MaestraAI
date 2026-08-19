// RAG over plan attachments. Chunks are cut at extract time from the FULL transcription
// (the flat prompt block only carries the first 12k chars — retrieval reaches the rest),
// embedded with the same OpenAI model as every other embedding in the app, and fetched at
// generation via match_attachment_chunks keyed by upload path. Best-effort everywhere.
import { embed, toVector } from './embeddings'

export const CHUNK_SIZE = 1200
export const CHUNK_OVERLAP = 200
const MAX_CHUNKS = 30

/** Overlapping character chunks, cut on line boundaries when possible. Pure. */
export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const clean = text.trim()
  if (!clean) return []
  const out: string[] = []
  let start = 0
  while (start < clean.length && out.length < MAX_CHUNKS) {
    let end = Math.min(start + size, clean.length)
    if (end < clean.length) {
      const nl = clean.lastIndexOf('\n', end)
      if (nl > start + size / 2) end = nl
    }
    out.push(clean.slice(start, end).trim())
    if (end >= clean.length) break
    start = Math.max(end - overlap, start + 1)
  }
  return out.filter(Boolean)
}

/** Embed + store the chunks for one attachment. Silent no-op without OPENAI_API_KEY. */
export async function ingestAttachmentChunks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any,
  teacherId: string,
  attachmentKey: string,
  fullText: string
): Promise<number> {
  try {
    const chunks = chunkText(fullText)
    if (!chunks.length) return 0
    const rows = []
    for (let i = 0; i < chunks.length; i++) {
      const vec = await embed(chunks[i])
      rows.push({
        teacher_id: teacherId,
        attachment_key: attachmentKey,
        idx: i,
        content: chunks[i],
        embedding: vec ? toVector(vec) : null,
      })
    }
    const { error } = await service.from('plan_attachment_chunks').insert(rows)
    if (error) throw error
    return rows.length
  } catch (e) {
    console.error('[attachment-rag] ingest skipped:', e)
    return 0
  }
}

/** Top-k relevant fragments for this plan's attachments. Empty on any failure. */
export async function matchAttachmentChunks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: any,
  teacherId: string,
  keys: string[],
  query: string,
  k = 6
): Promise<{ content: string; attachment_key: string }[]> {
  try {
    if (!keys.length || !query.trim()) return []
    const vec = await embed(query)
    if (!vec) return []
    const { data, error } = await service.rpc('match_attachment_chunks', {
      query_embedding: toVector(vec),
      p_teacher: teacherId,
      p_keys: keys,
      match_count: k,
    })
    if (error) throw error
    return data ?? []
  } catch (e) {
    console.error('[attachment-rag] match skipped:', e)
    return []
  }
}
