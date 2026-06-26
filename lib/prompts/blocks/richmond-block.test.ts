import { describe, it, expect } from 'vitest'
import { buildRichmondBlock, buildGameVocabularyHint } from './richmond-block'
import type { SelectedRichmondContent } from '@/lib/richmond/types'

const content: SelectedRichmondContent = {
  book_code: 'TG5A',
  unit_number: 3,
  unit_title: 'My Busy Week',
  lesson_ranges: ['1-4', '5-8'],
  vocabulary: ['Monday', 'Tuesday', 'Wednesday'],
  language_models: ['What day is it?', 'It is Monday.'],
  learning_goals: ['Name the days of the week'],
}

describe('buildRichmondBlock', () => {
  it("returns '' when passed null", () => {
    expect(buildRichmondBlock(null)).toBe('')
  })

  it('returns a well-formed <proni_unit> block with all fields', () => {
    const b = buildRichmondBlock(content)
    expect(b.startsWith('<proni_unit>')).toBe(true)
    expect(b.trimEnd().endsWith('</proni_unit>')).toBe(true)
    expect(b).toContain('Libro: TG5A | Unidad 3: "My Busy Week"')
    expect(b).toContain('Lecciones: 1-4, 5-8')
    expect(b).toContain('Monday, Tuesday, Wednesday')
    expect(b).toContain('- What day is it?')
    expect(b).toContain('- Name the days of the week')
  })
})

describe('buildGameVocabularyHint', () => {
  it("returns '' when null or no vocab", () => {
    expect(buildGameVocabularyHint(null)).toBe('')
    expect(buildGameVocabularyHint({ ...content, vocabulary: [] })).toBe('')
  })
  it('lists up to 10 vocab words', () => {
    const hint = buildGameVocabularyHint(content)
    expect(hint).toContain('Monday, Tuesday, Wednesday')
    expect(hint).toContain('juegos de inglés deben usar')
  })
})
