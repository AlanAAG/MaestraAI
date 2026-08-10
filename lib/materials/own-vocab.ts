// The models keep slipping in words the teacher never taught. Prompts ask for her vocabulary;
// this is the code guarantee, applied after every game build.

const norm = (w: unknown) =>
  String(w ?? '')
    .trim()
    .toLowerCase()

/** Keep only entries whose word is in the teacher's vocabulary. Falls back to the original list
 * when filtering would leave less than `min` — an empty game is worse than a stray word. */
export function keepVocabItems<T>(
  items: T[],
  wordOf: (item: T) => unknown,
  vocabulary: string[],
  min = 3
): T[] {
  if (!vocabulary.length) return items
  const vocab = new Set(vocabulary.map(norm))
  const kept = items.filter((it) => vocab.has(norm(wordOf(it))))
  if (kept.length >= min) return kept
  console.warn(
    `[own-vocab] only ${kept.length}/${items.length} items were in the teacher's vocabulary — keeping the model's list`
  )
  return items
}

/** Wrong-answer choices drawn from the teacher's OWN vocabulary (never invented words).
 * Deterministic per word so regenerating the same game doesn't reshuffle the sheet. */
export function vocabFoils(
  word: string,
  vocabulary: string[],
  count: number,
  fallback: string[] = []
): string[] {
  const others = vocabulary.filter((v) => norm(v) !== norm(word))
  if (others.length < count) return fallback.slice(0, count)
  // Rotate the list by a hash of the word: stable, cheap, and different per item.
  const seed = Array.from(norm(word)).reduce((a, c) => a + c.charCodeAt(0), 0)
  const start = seed % others.length
  return Array.from(
    { length: count },
    (_, i) => others[(start + i * 3 + 1) % others.length]
  ).filter((v, i, arr) => arr.indexOf(v) === i)
}
