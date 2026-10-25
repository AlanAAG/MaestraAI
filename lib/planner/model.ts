import { OPENAI_MODELS } from '@/lib/ai/models'
// Shared transport for planner text and JSON tasks. A response is usable only when the
// provider finished it; valid JSON alone says nothing about pedagogical completeness.
import OpenAIProvider, { shouldTryAnotherModel } from '@/lib/ai/openai-provider'

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
  if (!process.env.OPENAI_API_KEY) throw new PlannerServiceError()
  const provider = new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0 })
  const instructions = opts.cachePrefix ? `${opts.cachePrefix}\n\n${system}` : system
  let lastError: unknown
  for (const model of [OPENAI_MODELS.routine, OPENAI_MODELS.planning]) {
    opts.signal?.throwIfAborted()
    try {
      const resp = await provider.messages.create(
        {
          model,
          max_tokens: maxTokens,
          jsonMode: format === 'json',
          system: instructions,
          messages: [{ role: 'user', content: user }],
        },
        requestOptions
      )
      console.log(
        `[planner-tokens] ${opts.label ?? 'call'} ${model}: in=${resp.usage.input_tokens} out=${resp.usage.output_tokens} stop=${resp.stop_reason}`
      )
      if (resp.stop_reason !== 'end_turn') {
        throw new Error(`Respuesta incompleta de la IA (${resp.stop_reason}).`)
      }
      return checked(
        resp.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('\n')
      )
    } catch (error) {
      opts.signal?.throwIfAborted()
      lastError = error
      console.warn(
        `[planner] ${opts.label ?? 'call'} ${model} failed`,
        error instanceof Error ? error.message : 'provider error'
      )
      if (model === OPENAI_MODELS.routine && !shouldTryAnotherModel(error)) {
        throw new PlannerServiceError()
      }
    }
  }
  if (lastError instanceof Error && /incompleta|no terminó/.test(lastError.message)) throw lastError
  throw new PlannerServiceError()
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
