// Shared model caller for planeación generation.
// Sonnet is PRIMARY (depth + teacher-voice fidelity matter most here); gpt-4o-mini is the
// fallback (json_object mode → guaranteed valid JSON) if Anthropic errors.
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export async function callPlannerModel(
  system: string,
  user: string,
  opts: { maxTokens?: number; cachePrefix?: string; label?: string } = {}
): Promise<string> {
  // A quincena document is 4,000-6,000 words of Spanish plus JSON overhead, and Sonnet 5's
  // tokenizer runs ~30% fatter — 20000 was not enough headroom. Truncation here is expensive:
  // the cut-off JSON fails to parse, and the json_object fallback rescues the request with a
  // weaker, 16K-capped model, which is how a teacher ends up with a thin, half-empty plan.
  // Sonnet 5 allows up to 128K output; the streaming call below is what makes a cap this
  // large safe (a non-streaming request that size risks an HTTP timeout).
  const maxTokens = opts.maxTokens ?? 64000

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
      // Streamed, then collected: required at these max_tokens values so a long document
      // can't trip the SDK's HTTP timeout. Same response shape as messages.create.
      const resp = await anthropic.messages
        .stream({
          model: 'claude-sonnet-5',
          max_tokens: maxTokens,
          thinking: { type: 'disabled' },
          system: systemParam,
          messages: [{ role: 'user', content: user }],
        })
        .finalMessage()
      // Cost telemetry: cache reads are ~90% cheaper — this line is how we SEE whether the
      // cachePrefix is actually hitting, and where the input tokens go. One line per call.
      const u = resp.usage
      console.log(
        `[planner-tokens] ${opts.label ?? 'call'}: in=${u.input_tokens} cache_write=${u.cache_creation_input_tokens ?? 0} cache_read=${u.cache_read_input_tokens ?? 0} out=${u.output_tokens}`
      )
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

  return callOpenAiJson(system, user, { ...opts, maxTokens })
}

/** The JSON-mode fallback: gpt-4o-mini in json_object mode can only return valid JSON. */
async function callOpenAiJson(
  system: string,
  user: string,
  opts: { maxTokens?: number; cachePrefix?: string } = {}
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error('No model provider configured')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: Math.min(opts.maxTokens ?? 20000, 16384),
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: opts.cachePrefix ? `${opts.cachePrefix}\n\n${system}` : system },
      { role: 'user', content: user },
    ],
  })
  return resp.choices[0]?.message?.content ?? ''
}

/**
 * Call the model and parse its JSON, with ONE automatic retry through the json_object fallback.
 *
 * Sonnet occasionally returns unparseable JSON — usually because a long document hit max_tokens
 * and got cut mid-string. The provider fallback in callPlannerModel only fires when Anthropic
 * *errors*; a successful-but-truncated response sailed past it and killed the whole generation
 * with "La respuesta del modelo no es JSON válido" — an hour of the teacher's plan, gone, with
 * nothing to retry but the whole button. json_object mode cannot return invalid JSON.
 */
export async function callPlannerJson<T = Record<string, unknown>>(
  system: string,
  user: string,
  opts: { maxTokens?: number; cachePrefix?: string; label?: string } = {}
): Promise<T> {
  const raw = await callPlannerModel(system, user, opts)
  try {
    return parsePlanJson<T>(raw)
  } catch (err) {
    console.error(
      `[planner] ${opts.label ?? 'call'}: primary model returned invalid JSON (${raw.length} chars) — retrying in json_object mode`
    )
    if (!process.env.OPENAI_API_KEY) throw err
    return parsePlanJson<T>(await callOpenAiJson(system, user, opts))
  }
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
