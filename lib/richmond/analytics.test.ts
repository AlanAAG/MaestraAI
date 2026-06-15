import { describe, it, expect } from 'vitest'
import { computeAverage, computeMedian, computeMode, computeDistribution } from './analytics'

describe('richmond analytics helpers', () => {
  it('returns null / empty for empty input', () => {
    expect(computeAverage([])).toBeNull()
    expect(computeMedian([])).toBeNull()
    expect(computeMode([])).toBeNull()
    expect(computeDistribution([])).toEqual([
      { bucket: '0–20', count: 0 },
      { bucket: '20–40', count: 0 },
      { bucket: '40–60', count: 0 },
      { bucket: '60–80', count: 0 },
      { bucket: '80–100', count: 0 },
    ])
  })

  it('handles single value (no mode for unique)', () => {
    expect(computeAverage([80])).toBe(80)
    expect(computeMedian([80])).toBe(80)
    expect(computeMode([80])).toBeNull()
    expect(computeDistribution([80])).toEqual([
      { bucket: '0–20', count: 0 },
      { bucket: '20–40', count: 0 },
      { bucket: '40–60', count: 0 },
      { bucket: '60–80', count: 1 },
      { bucket: '80–100', count: 0 },
    ])
  })

  it('computes stats correctly for multi-value set', () => {
    const scores = [60, 70, 70, 80, 90]
    expect(computeAverage(scores)).toBe(74)
    expect(computeMedian(scores)).toBe(70)
    expect(computeMode(scores)).toBe(70)
  })

  it('computes even-length median as average of two middles', () => {
    expect(computeMedian([60, 80])).toBe(70)
  })

  it('distributes 100 into the 80–100 bucket', () => {
    const dist = computeDistribution([10, 30, 50, 70, 90, 100])
    expect(dist[0]).toEqual({ bucket: '0–20', count: 1 })
    expect(dist[1]).toEqual({ bucket: '20–40', count: 1 })
    expect(dist[2]).toEqual({ bucket: '40–60', count: 1 })
    expect(dist[3]).toEqual({ bucket: '60–80', count: 1 })
    expect(dist[4]).toEqual({ bucket: '80–100', count: 2 })
  })
})
