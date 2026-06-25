// Self-improving planeaciones: distill a teacher's accumulated edited plans + corrections into an
// evolving style profile (refreshed writing samples + a short learned-preferences note) that is
// injected into future generations. All DB calls are best-effort (graceful until migration 055).
import Anthropic from '@anthropic-ai/sdk'
import type { TeacherProfile } from '@/types/teacher-profile'
import { planEmbeddingText } from './embeddings'

const REFRESH_AFTER_CORRECTIONS = 5
const REFRESH_AFTER_DAYS = 14
const ONE_DAY = 86_400_000

export type LearnedProfile = {
  profile: TeacherProfile
  preferences: string | null
  source_count: number
  refreshed_at: string
}

type Correction = { section: string; original: string | null; edited: string | null }

// --- pure helpers (unit-tested) ---

export function isStale(
  refreshedAt: string | null,
  newCorrections: number,
  nowMs: number
): boolean {
  if (!refreshedAt) return true // never distilled yet
  if (newCorrections >= REFRESH_AFTER_CORRECTIONS) return true
  return (nowMs - new Date(refreshedAt).getTime()) / ONE_DAY > REFRESH_AFTER_DAYS
}

export function buildDistillUserPrompt(planTexts: string[], corrections: Correction[]): string {
  const plans = planTexts
    .map((t, i) => `--- Planeación ${i + 1} ---\n${t.slice(0, 2000)}`)
    .join('\n\n')
  const corr = corrections
    .map(
      (c) =>
        `Sección "${c.section}":\nANTES (IA): ${(c.original ?? '').slice(0, 500)}\nDESPUÉS (maestra): ${(c.edited ?? '').slice(0, 500)}`
    )
    .join('\n\n')
  return `PLANEACIONES RECIENTES DE LA MAESTRA:\n${plans || '(ninguna)'}\n\nCORRECCIONES QUE HIZO (lo que la IA escribió vs lo que ella prefirió):\n${corr || '(ninguna)'}`
}

const DISTILL_SYSTEM = `Eres un analista de estilo docente. A partir de las planeaciones y correcciones de UNA maestra de preescolar, destila su estilo para que otra IA escriba EXACTAMENTE como ella.

Responde SOLO con JSON válido:
{
  "writing_style_samples": ["2-4 fragmentos VERBATIM y cortos (de su texto, preferentemente del DESPUÉS de sus correcciones) que mejor capturan su voz"],
  "preferences": "1 párrafo conciso y accionable: qué agrega, cómo reformula, qué evita o elimina, su tono, vocabulario y nivel de detalle. Basado en patrones de sus correcciones."
}

Reglas: NO inventes; usa solo lo observado. NUNCA incluyas nombres de alumnos (sustituye por 'Alumno'). Si no hay señal suficiente, devuelve writing_style_samples: [] y preferences: "".`

// --- DB-backed ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getLearnedProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  teacherId: string,
  planType: string
): Promise<LearnedProfile | null> {
  try {
    const { data } = await supabase
      .from('teacher_learned_profile')
      .select('profile, preferences, source_count, refreshed_at')
      .eq('teacher_id', teacherId)
      .eq('plan_type', planType)
      .maybeSingle()
    return (data as LearnedProfile) ?? null
  } catch {
    return null
  }
}

export async function refreshLearnedProfileIfStale(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  teacherId: string,
  planType: string
): Promise<void> {
  try {
    const existing = await getLearnedProfile(supabase, teacherId, planType)
    let q = supabase
      .from('plan_corrections')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)
    if (existing?.refreshed_at) q = q.gt('created_at', existing.refreshed_at)
    const { count } = await q
    if (!isStale(existing?.refreshed_at ?? null, count ?? 0, Date.now())) return
    await refreshLearnedProfile(supabase, teacherId, planType)
  } catch (e) {
    console.error('[learning] stale check skipped:', e)
  }
}

export async function refreshLearnedProfile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  teacherId: string,
  planType: string
): Promise<{ source_count: number } | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    // Recent plans of this type (voice source) + recent corrections (preference source).
    const { data: plans } = await supabase
      .from('fortnights')
      .select('plan_document, created_at')
      .eq('teacher_id', teacherId)
      .eq('plan_type', planType)
      .not('plan_document', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)
    const { data: corrections } = await supabase
      .from('plan_corrections')
      .select('section, original, edited')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .limit(20)

    const planTexts: string[] = (plans ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => planEmbeddingText(p.plan_document ?? {}))
      .filter((t: string) => t.trim().length > 0)
    const corr = (corrections ?? []) as Correction[]
    const sourceCount = planTexts.length + corr.length
    if (sourceCount === 0) return null

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1500,
      temperature: 0,
      system: DISTILL_SYSTEM,
      messages: [
        { role: 'user', content: buildDistillUserPrompt(planTexts, corr) },
        { role: 'assistant', content: '{' },
      ],
    })
    const raw = '{' + (resp.content[0]?.type === 'text' ? resp.content[0].text : '')
    let parsed: { writing_style_samples?: string[]; preferences?: string }
    try {
      parsed = JSON.parse(raw)
    } catch {
      const m = raw.match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : {}
    }

    await supabase.from('teacher_learned_profile').upsert(
      {
        teacher_id: teacherId,
        plan_type: planType,
        profile: { writing_style_samples: parsed.writing_style_samples ?? [] },
        preferences: parsed.preferences ?? '',
        source_count: sourceCount,
        refreshed_at: new Date().toISOString(),
      },
      { onConflict: 'teacher_id,plan_type' }
    )
    return { source_count: sourceCount }
  } catch (e) {
    console.error('[learning] refresh failed (migration 055 not pushed?):', e)
    return null
  }
}
