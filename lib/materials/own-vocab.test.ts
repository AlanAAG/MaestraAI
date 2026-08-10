import { describe, it, expect } from 'vitest'
import { keepVocabItems, vocabFoils } from './own-vocab'

const VOCAB = ['cat', 'dog', 'bird', 'fish', 'cow']

describe('keepVocabItems', () => {
  it('drops words the teacher never taught', () => {
    const items = [{ word: 'cat' }, { word: 'dragon' }, { word: 'Dog' }, { word: 'bird' }]
    expect(keepVocabItems(items, (i) => i.word, VOCAB).map((i) => i.word)).toEqual([
      'cat',
      'Dog', // case/space-insensitive match
      'bird',
    ])
  })

  it('never empties a game: keeps the model list when too little survives', () => {
    const items = [{ word: 'cat' }, { word: 'dragon' }, { word: 'unicorn' }]
    expect(keepVocabItems(items, (i) => i.word, VOCAB)).toHaveLength(3)
  })

  it('is a no-op without a vocabulary', () => {
    const items = [{ word: 'anything' }]
    expect(keepVocabItems(items, (i) => i.word, [])).toEqual(items)
  })
})

describe('vocabFoils', () => {
  it('draws wrong answers from her own words, never the answer itself', () => {
    const foils = vocabFoils('cat', VOCAB, 3)
    expect(foils).toHaveLength(3)
    expect(foils).not.toContain('cat')
    for (const f of foils) expect(VOCAB).toContain(f)
  })

  it('is stable for the same word', () => {
    expect(vocabFoils('dog', VOCAB, 3)).toEqual(vocabFoils('dog', VOCAB, 3))
  })

  it('falls back to the model foils when she has too few words', () => {
    expect(vocabFoils('cat', ['cat', 'dog'], 3, ['x', 'y', 'z'])).toEqual(['x', 'y', 'z'])
  })
})
