export type ScoreBucket = { bucket: string; count: number }

const BUCKETS = ['0–20', '20–40', '40–60', '60–80', '80–100']

export function computeAverage(scores: number[]): number | null {
  if (scores.length === 0) return null
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

export function computeMedian(scores: number[]): number | null {
  if (scores.length === 0) return null
  const sorted = [...scores].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

// Returns null when every value appears exactly once (no clear mode)
export function computeMode(scores: number[]): number | null {
  if (scores.length === 0) return null
  const freq = new Map<number, number>()
  for (const s of scores) freq.set(s, (freq.get(s) ?? 0) + 1)
  const entries = Array.from(freq.entries())
  const max = Math.max(...Array.from(freq.values()))
  if (max === 1) return null
  return entries.find(([, c]) => c === max)![0]
}

export function computeDistribution(scores: number[]): ScoreBucket[] {
  const counts = [0, 0, 0, 0, 0]
  for (const s of scores) counts[Math.min(Math.max(Math.ceil(s / 20) - 1, 0), 4)]++
  return BUCKETS.map((bucket, i) => ({ bucket, count: counts[i] }))
}
