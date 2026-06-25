// Teacher's-own-planeaciones retrieval. Embeds each generated plan and retrieves the teacher's
// most-similar past plans as style examples. All calls degrade gracefully (no key, no migration,
// any error → skip) so generation never breaks.
import OpenAI from 'openai'

const EMBED_MODEL = 'text-embedding-3-small' // 1536 dims (matches the migration)

export async function embed(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY || !text.trim()) return null
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const r = await openai.embeddings.create({ model: EMBED_MODEL, input: text.slice(0, 8000) })
    return r.data[0]?.embedding ?? null
  } catch (e) {
    console.error('[embeddings] embed failed:', e)
    return null
  }
}

// The voice-bearing text of a generated plan_document (what we embed + later inject).
export function planEmbeddingText(pd: Record<string, unknown>): string {
  const parts = [
    pd.proyecto,
    pd.desarrollo_taller,
    pd.actividades_iniciales,
    pd.actividades_rutina,
    pd.estrategia_comunitaria,
    pd.aventura_lectora,
  ]
  return parts.filter((p): p is string => typeof p === 'string' && p.trim().length > 0).join('\n\n')
}

// pgvector accepts the array literal as text — stringify so it casts cleanly via PostgREST.
const toVector = (v: number[]) => JSON.stringify(v)

export async function storePlaneacionEmbedding(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  args: { fortnightId: string; teacherId: string; projectName: string; content: string }
): Promise<void> {
  if (!args.content.trim()) return
  const vec = await embed(args.content)
  if (!vec) return
  try {
    await supabase.from('planeacion_embeddings').upsert(
      {
        fortnight_id: args.fortnightId,
        teacher_id: args.teacherId,
        project_name: args.projectName,
        content: args.content.slice(0, 4000),
        embedding: toVector(vec),
      },
      { onConflict: 'fortnight_id' }
    )
  } catch (e) {
    console.error('[embeddings] store failed (migration 054 not pushed?):', e)
  }
}

export type StyleExample = { project_name: string; content: string; similarity: number }

export async function matchPlaneaciones(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  args: { queryText: string; teacherId: string; excludeFortnight: string; count?: number }
): Promise<StyleExample[]> {
  const vec = await embed(args.queryText)
  if (!vec) return []
  try {
    const { data, error } = await supabase.rpc('match_planeaciones', {
      query_embedding: toVector(vec),
      p_teacher_id: args.teacherId,
      exclude_fortnight: args.excludeFortnight,
      match_count: args.count ?? 3,
    })
    if (error) return []
    return (data ?? []) as StyleExample[]
  } catch {
    return []
  }
}

// The prompt block injected into generation (dynamic, NOT cached — per-teacher, per-topic).
export function styleExamplesBlock(plans: StyleExample[]): string {
  if (!plans.length) return ''
  const ex = plans
    .map(
      (p, i) =>
        `Ejemplo ${i + 1}${p.project_name ? ` (proyecto "${p.project_name}")` : ''}:\n"${(p.content || '').slice(0, 1500)}"`
    )
    .join('\n\n')
  return `<ejemplos_estilo_maestra>\nFragmentos VERBATIM de planeaciones ANTERIORES de ESTA misma maestra (sus proyectos pasados más parecidos a este). Imita su voz, vocabulario, estructura y nivel de detalle — escribe como ella:\n\n${ex}\n</ejemplos_estilo_maestra>`
}
