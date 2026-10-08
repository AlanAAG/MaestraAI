// Shared transport for planner text and JSON tasks. A response is usable only when the
// provider finished it; valid JSON alone says nothing about pedagogical completeness.
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export type PlannerModelOptions = {
  maxTokens?: number
  cachePrefix?: string
  label?: string
  signal?: AbortSignal
  timeoutMs?: number
}

export class PlannerServiceError extends Error {
  constructor() {
    super(
      'El servicio de IA no está disponible en este momento. Intenta en unos minutos; tu planeación guardada se conserva.'
    )
    this.name = 'PlannerServiceError'
  }
}

async function requestPlanner(
  system: string,
  user: string,
  opts: PlannerModelOptions,
  format: 'text' | 'json'
): Promise<string> {
  const maxTokens = opts.maxTokens ?? 12000
  const timeout = opts.timeoutMs ?? 75000
  const requestOptions = { signal: opts.signal, timeout, maxRetries: 0 }
  const checked = (text: string) => {
    if (!text.trim()) throw new Error('La IA devolvió una respuesta vacía.')
    if (format === 'json') parsePlanJson(text)
    return text
  }
  opts.signal?.throwIfAborted()
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 })
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
      const resp = await anthropic.messages
        .stream(
          {
            model: 'claude-sonnet-5',
            max_tokens: maxTokens,
            thinking: { type: 'disabled' },
            system: systemParam,
            messages: [{ role: 'user', content: user }],
          },
          requestOptions
        )
        .finalMessage()
      console.log(
        `[planner-tokens] ${opts.label ?? 'call'}: in=${resp.usage.input_tokens} out=${resp.usage.output_tokens} stop=${resp.stop_reason}`
      )
      if (resp.stop_reason !== 'end_turn') {
        throw new Error(`Respuesta incompleta de la IA (${resp.stop_reason}).`)
      }
      return checked(
        resp.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n')
      )
    } catch (error) {
      opts.signal?.throwIfAborted()
      console.warn(
        `[planner] ${opts.label ?? 'call'}: primary failed; trying fallback`,
        error instanceof Error ? error.message : 'provider error'
      )
      if (!process.env.OPENAI_API_KEY) throw error
    }
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('No model provider configured')
  opts.signal?.throwIfAborted()
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 })
  const resp = await openai.chat.completions
    .create(
      {
        model: 'gpt-4o-mini',
        max_tokens: Math.min(maxTokens, 16384),
        temperature: 0.4,
        // Section rewriting requires plain text. Forcing JSON here used to break its fallback.
        ...(format === 'json' ? { response_format: { type: 'json_object' as const } } : {}),
        messages: [
          {
            role: 'system',
            content: opts.cachePrefix ? `${opts.cachePrefix}\n\n${system}` : system,
          },
          { role: 'user', content: user },
        ],
      },
      requestOptions
    )
    .catch((error: unknown) => {
      opts.signal?.throwIfAborted()
      console.error(
        `[planner] ${opts.label ?? 'call'}: fallback unavailable`,
        error instanceof Error ? error.message : 'provider error'
      )
      throw new PlannerServiceError()
    })
  const choice = resp.choices[0]
  if (choice?.finish_reason !== 'stop' || choice.message.refusal) {
    throw new Error('La IA no terminó esta sección. Intenta de nuevo.')
  }
  return checked(choice.message.content ?? '')
}

export function callPlannerModel(
  system: string,
  user: string,
  opts: PlannerModelOptions = {}
): Promise<string> {
  return requestPlanner(system, user, opts, 'text')
}

export async function callPlannerJson<T = Record<string, unknown>>(
  system: string,
  user: string,
  opts: PlannerModelOptions = {}
): Promise<T> {
  return parsePlanJson<T>(await requestPlanner(system, user, opts, 'json'))
}

// Accept wrappers/fences, but never salvage an inner object from a truncated outer document.
export function parsePlanJson<T = Record<string, unknown>>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  const candidates = [cleaned]
  // An unfinished outer document starts with '{'; extracting to an inner closing brace could
  // turn a truncated plan into a seemingly successful response.
  if (first > 0 && last > first) candidates.push(cleaned.slice(first, last + 1))
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as T
    } catch {
      /* try the next wrapper */
    }
  }
  throw new Error('La respuesta del modelo no es un objeto JSON válido')
}
