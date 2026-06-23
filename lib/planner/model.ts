// Shared model caller for planeación generation.
// Sonnet is PRIMARY (depth + teacher-voice fidelity matter most here); gpt-4o-mini is the
// fallback (json_object mode → guaranteed valid JSON) if Anthropic errors.
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export async function callPlannerModel(
  system: string,
  user: string,
  opts: { maxTokens?: number } = {}
): Promise<string> {
  const maxTokens = opts.maxTokens ?? 16384

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        temperature: 0.4,
        system,
        messages: [{ role: 'user', content: user }],
      })
      const c = resp.content[0]
      if (c?.type === 'text' && c.text.trim()) return c.text
      throw new Error('Empty Sonnet response')
    } catch (e) {
      console.error('[planner] Sonnet failed, falling back to gpt-4o-mini:', e)
    }
  }

  if (!process.env.OPENAI_API_KEY) throw new Error('No model provider configured')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: Math.min(maxTokens, 16384),
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })
  return resp.choices[0]?.message?.content ?? ''
}

// Strips ```json fences and parses. Falls back to the outermost {...} block if the model
// added a stray prefix/suffix (long Sonnet responses occasionally do). Throws if still invalid.
export function parsePlanJson<T = Record<string, unknown>>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\n?/, '')
    .replace(/\n?```$/, '')
    .trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const first = cleaned.indexOf('{')
    const last = cleaned.lastIndexOf('}')
    if (first !== -1 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1)) as T
      } catch {
        /* fall through */
      }
    }
    throw new Error('La respuesta del modelo no es JSON válido')
  }
}
