import { describe, it, expect } from 'vitest'
import { richmondSourceLabel, lettersSourceLabel } from './vocab-source'

describe('richmondSourceLabel', () => {
  it('single unit → number + title', () => {
    expect(richmondSourceLabel([{ unit_number: 3, unit_title: 'Food' }])).toBe('Unidad 3 — Food')
  })
  it('multiple units → numbers only', () => {
    expect(
      richmondSourceLabel([
        { unit_number: 2, unit_title: 'Family' },
        { unit_number: 3, unit_title: 'Food' },
      ])
    ).toBe('Unidades 2, 3')
  })
  it('empty → generic', () => {
    expect(richmondSourceLabel([])).toBe('Richmond')
  })
})

describe('lettersSourceLabel', () => {
  const vocab = [
    { word: 'apple', letter: 'a' },
    { word: 'ball', letter: 'B' },
    { word: 'cat', letter: 'C' },
  ]
  it('collects sorted unique letters of the selected words', () => {
    expect(lettersSourceLabel(['ball', 'Apple', 'apple'], vocab)).toBe('Letras A · B')
  })
  it('falls back when no letters match (manual words)', () => {
    expect(lettersSourceLabel(['zebra'], vocab)).toBe('Mi vocabulario')
  })
})
