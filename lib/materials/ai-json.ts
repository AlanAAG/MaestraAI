import { z } from 'zod'

// Shared extraction for Claude material builders (they all emitted the same regex inline).
// Pulls the JSON out of a ```json fence or the outermost {...} block.
export function extractJson(text: string): unknown {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
  const raw = match?.[1] ?? match?.[0]
  if (!raw) throw new Error('El modelo no devolvió JSON válido')
  return JSON.parse(raw)
}

// Extract + validate against a Zod schema. Throws a clear error if the shape is wrong, so the
// caller (route) isolates the bad material instead of persisting garbage.
export function parseAIJson<T>(text: string, schema: z.ZodType<T>): T {
  const parsed = extractJson(text)
  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`Respuesta del modelo con formato inválido: ${result.error.issues[0]?.message}`)
  }
  return result.data
}
