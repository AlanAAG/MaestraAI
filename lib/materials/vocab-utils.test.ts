import { describe, it, expect } from 'vitest'
import { studiedLetter } from './picture-word-match'
import { extractVocabulary } from './vocab-utils'

describe('extractVocabulary', () => {
  it('returns a deduplicated string array from valid input', () => {
    expect(extractVocabulary(['cat', 'dog', 'cat'])).toEqual(['cat', 'dog'])
  })

  it('filters non-string values (regression: generate-all read blocks[].vocabulary instead of top-level)', () => {
    // When the wrong field is read, the result is often an array of objects or numbers
    expect(extractVocabulary(['cat', 1, null, undefined, 'dog', { word: 'bird' }])).toEqual([
      'cat',
      'dog',
    ])
  })

  it('returns empty array for empty input', () => {
    expect(extractVocabulary([])).toEqual([])
  })

  it('returns empty array for null input', () => {
    expect(extractVocabulary(null)).toEqual([])
  })

  it('filters out empty strings', () => {
    expect(extractVocabulary(['cat', '', 'dog', '   '])).toEqual(['cat', 'dog', '   '])
  })
})

describe('studiedLetter', () => {
  it('uses the quincena letter the word belongs to', () => {
    expect(studiedLetter('apple', ['A', 'B'])).toBe('A')
    expect(studiedLetter('ball', ['A', 'B'])).toBe('B')
  })
  it('falls back to the word initial when no quincena letter matches', () => {
    expect(studiedLetter('cat', ['A', 'B'])).toBe('C')
    expect(studiedLetter('dog')).toBe('D')
    expect(studiedLetter('')).toBe('')
  })
})
