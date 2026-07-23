import { describe, expect, it } from 'vitest'
import { activeGroups, archivedGroups } from './archive'

describe('group archive split', () => {
  const groups = [
    { id: 'a', archived_at: null },
    { id: 'b', archived_at: '2026-07-01T00:00:00Z' },
    { id: 'c' }, // pre-migration row: column absent → active
  ]

  it('activeGroups keeps null/absent archived_at', () => {
    expect(activeGroups(groups).map((g) => g.id)).toEqual(['a', 'c'])
  })

  it('archivedGroups keeps only archived', () => {
    expect(archivedGroups(groups).map((g) => g.id)).toEqual(['b'])
  })
})
