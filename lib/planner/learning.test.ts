import { describe, it, expect } from 'vitest'
import { isStale, buildDistillUserPrompt } from './learning'

const NOW = new Date('2026-06-25T00:00:00Z').getTime()
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

describe('isStale', () => {
  it('is stale when never distilled', () => {
    expect(isStale(null, 0, NOW)).toBe(true)
  })
  it('is stale after enough new corrections', () => {
    expect(isStale(daysAgo(1), 5, NOW)).toBe(true)
    expect(isStale(daysAgo(1), 4, NOW)).toBe(false)
  })
  it('is stale after the age threshold', () => {
    expect(isStale(daysAgo(15), 0, NOW)).toBe(true)
    expect(isStale(daysAgo(13), 0, NOW)).toBe(false)
  })
})

describe('buildDistillUserPrompt', () => {
  it('includes plan excerpts and original→edited corrections', () => {
    const p = buildDistillUserPrompt(
      ['Hoy exploramos el mar con los niños.'],
      [{ section: 'proyecto', original: 'Texto IA', edited: 'Texto de la maestra' }]
    )
    expect(p).toContain('Hoy exploramos el mar')
    expect(p).toContain('Texto IA')
    expect(p).toContain('Texto de la maestra')
    expect(p).toContain('proyecto')
  })
  it('handles empty inputs gracefully', () => {
    const p = buildDistillUserPrompt([], [])
    expect(p).toContain('(ninguna)')
  })
})
