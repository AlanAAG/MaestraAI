import { describe, it, expect } from 'vitest'
import { foilsFor, keepOwnContent } from './letter-recognition'

describe('foilsFor (letter-recognition distractors)', () => {
  it('returns 3 distinct foils that never include the target letter', () => {
    for (const L of ['A', 'B', 'M', 'Z']) {
      for (let i = 0; i < 6; i++) {
        const foils = foilsFor(L, i)
        expect(foils).toHaveLength(3)
        expect(new Set(foils).size).toBe(3) // distinct
        expect(foils).not.toContain(L) // never the answer
      }
    }
  })

  it('varies the foils across items (not the same 3 every time)', () => {
    // The whole point of the fix: distractors should differ between items for the same letter.
    const sets = Array.from({ length: 5 }, (_, i) => foilsFor('A', i).join(','))
    expect(new Set(sets).size).toBeGreaterThan(1)
  })

  it('is deterministic for a given (letter, index)', () => {
    expect(foilsFor('B', 2)).toEqual(foilsFor('B', 2))
  })

  it('handles unknown letters with a generic pool', () => {
    expect(foilsFor('', 0)).toHaveLength(3)
  })
})

describe('keepOwnContent', () => {
  const item = (word: string, image_url?: string) =>
    ({ word, target_letter: word[0], image_description: '', foil_letters: [], image_url }) as never

  it('drops words that are not in the teacher vocabulary', () => {
    const items = [item('apple'), item('ant'), item('axe'), item('zebra')]
    const kept = keepOwnContent(items, ['apple', 'ant', 'axe'], {})
    expect(kept.map((i) => i.word)).toEqual(['apple', 'ant', 'axe'])
  })

  it('prefers only words that have HER drawing when she uploaded any', () => {
    const items = [item('apple', 'u1'), item('ant', 'u2'), item('axe', 'u3'), item('air')]
    const kept = keepOwnContent(items, ['apple', 'ant', 'axe', 'air'], { apple: 'u1' })
    expect(kept.map((i) => i.word)).toEqual(['apple', 'ant', 'axe'])
  })

  it('never empties the sheet: falls back when filtering leaves too few', () => {
    const items = [item('apple'), item('zebra'), item('tiger')]
    expect(keepOwnContent(items, ['apple'], {})).toHaveLength(3)
  })
})
