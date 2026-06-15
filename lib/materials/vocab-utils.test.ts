import { describe, it, expect } from 'vitest'
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
