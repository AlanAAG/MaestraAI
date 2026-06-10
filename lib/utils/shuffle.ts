/**
 * Seeded Fisher-Yates shuffle using a Linear Congruential Generator.
 * Deterministic for a given seed — same seed always produces the same order.
 */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed | 0
  for (let i = result.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) | 0
    const j = Math.abs(s) % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
