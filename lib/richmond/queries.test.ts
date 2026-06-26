import { describe, it, expect } from 'vitest'
import { mergeSelectedContent } from './queries'
import type { RichmondUnitWithGroups } from './types'

const unit: RichmondUnitWithGroups = {
  id: 'u1',
  book_code: 'TG5A',
  unit_number: 3,
  unit_title: 'My Busy Week',
  lesson_groups: [
    {
      id: 'g1',
      unit_id: 'u1',
      lesson_range: '1-4',
      lesson_start: 1,
      lesson_end: 4,
      learning_goals: ['Goal A'],
      vocabulary: ['Monday', 'Tuesday'],
      language_models: ['What day is it?'],
      sort_order: 1,
    },
    {
      id: 'g2',
      unit_id: 'u1',
      lesson_range: '5-8',
      lesson_start: 5,
      lesson_end: 8,
      learning_goals: ['Goal A', 'Goal B'], // 'Goal A' duplicated across groups
      vocabulary: ['Tuesday', 'Wednesday'], // 'Tuesday' duplicated
      language_models: ['What day is it?', 'It is Monday.'], // dup model
      sort_order: 2,
    },
    {
      id: 'g3',
      unit_id: 'u1',
      lesson_range: '9-12',
      lesson_start: 9,
      lesson_end: 12,
      learning_goals: [],
      vocabulary: ['Friday'],
      language_models: [],
      sort_order: 3,
    },
  ],
}

describe('mergeSelectedContent', () => {
  it('merges + dedupes vocabulary/models/goals across the selected groups', () => {
    const r = mergeSelectedContent(unit, ['g1', 'g2'])
    expect(r.vocabulary).toEqual(['Monday', 'Tuesday', 'Wednesday'])
    expect(r.language_models).toEqual(['What day is it?', 'It is Monday.'])
    expect(r.learning_goals).toEqual(['Goal A', 'Goal B'])
    expect(r.lesson_ranges).toEqual(['1-4', '5-8'])
    expect(r.unit_number).toBe(3)
    expect(r.book_code).toBe('TG5A')
  })

  it('orders lesson_ranges by sort_order regardless of selection order', () => {
    const r = mergeSelectedContent(unit, ['g3', 'g1'])
    expect(r.lesson_ranges).toEqual(['1-4', '9-12'])
  })

  it('returns empty arrays when no groups selected', () => {
    const r = mergeSelectedContent(unit, [])
    expect(r.vocabulary).toEqual([])
    expect(r.lesson_ranges).toEqual([])
  })
})
