export function extractVocabulary(raw: unknown): string[] {
  const arr = Array.isArray(raw) ? raw : []
  return arr
    .filter((w): w is string => typeof w === 'string' && w.length > 0)
    .filter((w, i, a) => a.indexOf(w) === i)
}
