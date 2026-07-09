// Shared model caller for planeación generation.
// Sonnet is PRIMARY (depth + teacher-voice fidelity matter most here); gpt-4o-mini is the
// fallback (json_object mode → guaranteed valid JSON) if Anthropic errors.
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export async function callPlannerModel(
  system: string,
  user: string,
  opts: { maxTokens?: number; cachePrefix?: string } = {}
): Promise<string> {
  // Sonnet 5's tokenizer produces ~30% more tokens for the same text — give output headroom
  // so documents sized for the old 16384 cap don't truncate.
  const maxTokens = opts.maxTokens ?? 20000

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      // The cachePrefix (static NEM grounding) is identical across every call in a generation,
      // so it's marked ephemeral-cacheable: the first call writes it, the rest read it (~90%
      // cheaper). It must be the FIRST system block for the cache prefix to match.
      const systemParam = opts.cachePrefix
        ? [
            {
              type: 'text' as const,
              text: opts.cachePrefix,
              cache_control: { type: 'ephemeral' as const },
            },
            { type: 'text' as const, text: system },
          ]
        : system
      // Sonnet 5 notes: assistant prefill and non-default temperature return 400 (removed);
      // thinking is explicitly DISABLED (omitting it runs adaptive thinking by default, which
      // spends output tokens this JSON-document task doesn't need). parsePlanJson already
      // handles fences/preamble, so the old "{" prefill is unnecessary.
      const resp = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: maxTokens,
        thinking: { type: 'disabled' },
        system: systemParam,
        messages: [{ role: 'user', content: user }],
      })
      if (resp.stop_reason === 'max_tokens') {
        // Diagnostic: the document was cut off. parsePlanJson recovery may still salvage it,
        // but this means maxTokens should rise or the request should be split.
        console.error('[planner] Sonnet response truncated (stop_reason=max_tokens)')
      }
      const c = resp.content.find((b) => b.type === 'text')
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
      { role: 'system', content: opts.cachePrefix ? `${opts.cachePrefix}\n\n${system}` : system },
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
