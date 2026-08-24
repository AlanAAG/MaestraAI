import { describe, expect, it } from 'vitest'
import { pickCurrentFortnight, pickLinkedPlayer } from './child-data'

const f = (number: number, start: string, end: string, vocabulary: string[] = []) => ({
  number,
  start_date: start,
  end_date: end,
  vocabulary,
})

describe('pickCurrentFortnight', () => {
  it('returns the fortnight covering today', () => {
    const rows = [f(1, '2026-08-01', '2026-08-14'), f(2, '2026-08-17', '2026-08-28')]
    expect(pickCurrentFortnight(rows, '2026-08-20')?.number).toBe(2)
    expect(pickCurrentFortnight(rows, '2026-08-01')?.number).toBe(1)
    expect(pickCurrentFortnight(rows, '2026-08-14')?.number).toBe(1)
  })

  it('falls back to the latest by number when today is in a gap', () => {
    const rows = [f(2, '2026-08-17', '2026-08-28'), f(1, '2026-08-01', '2026-08-14')]
    expect(pickCurrentFortnight(rows, '2026-08-15')?.number).toBe(2)
    expect(pickCurrentFortnight(rows, '2026-09-30')?.number).toBe(2)
  })

  it('returns null on empty input', () => {
    expect(pickCurrentFortnight([], '2026-08-20')).toBeNull()
  })
})

describe('pickLinkedPlayer', () => {
  it('picks the most recently created profile', () => {
    const players = [
      { id: 'a', created_at: '2026-01-01T00:00:00Z' },
      { id: 'b', created_at: '2026-06-01T00:00:00Z' },
      { id: 'c', created_at: '2026-03-01T00:00:00Z' },
    ]
    expect(pickLinkedPlayer(players)?.id).toBe('b')
  })

  it('tolerates missing created_at and empty input', () => {
    expect(pickLinkedPlayer([{ id: 'a' }, { id: 'b', created_at: '2026-01-01' }])?.id).toBe('b')
    expect(pickLinkedPlayer([])).toBeNull()
  })
})
