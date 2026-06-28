// Shared extraction for Claude material builders (they all emitted the same regex inline).
// Pulls the JSON out of a ```json fence or the outermost {...} block.
export function extractJson(text: string): unknown {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
  const raw = match?.[1] ?? match?.[0]
  if (!raw) throw new Error('El modelo no devolvió JSON válido')
  return JSON.parse(raw)
}
