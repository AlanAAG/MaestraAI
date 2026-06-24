import { describe, it, expect } from 'vitest'
import { parseLetterGrouped, clampVocabItems } from './parse'

describe('clampVocabItems', () => {
  it('normalizes odd LLM values instead of dropping the batch', () => {
    const out = clampVocabItems([
      { word: 'Apple', letter: 'A', color: 'rojo' }, // bad color → blue
      { word: 'BALL', color: 'blue' }, // missing letter → derived 'B'
      { word: 'x'.repeat(80), letter: 'X', color: 'green' }, // long word → sliced
      { word: 'árbol', letter: 'Á', color: 'red' }, // accented-only letter → dropped
      { word: '', letter: 'Z', color: 'red' }, // empty word → dropped
    ])
    expect(out).toEqual([
      { word: 'apple', letter: 'A', color: 'blue' },
      { word: 'ball', letter: 'B', color: 'blue' },
      { word: 'x'.repeat(50), letter: 'X', color: 'green' },
    ])
  })
})

describe('parseLetterGrouped', () => {
  it('parses letter-header-grouped paste (the format that failed)', () => {
    const text = `A
astronaut
ape
apple

B
ball
baby`
    const items = parseLetterGrouped(text)
    expect(items).toContainEqual(expect.objectContaining({ word: 'astronaut', letter: 'A' }))
    expect(items).toContainEqual(expect.objectContaining({ word: 'ball', letter: 'B' }))
    expect(items.find((i) => i.word === 'a')).toBeUndefined() // header not a word
    expect(items).toHaveLength(5)
  })

  it('parses inline "A: apple, ant" format', () => {
    const items = parseLetterGrouped('A: apple, ant\nB: ball')
    expect(items.map((i) => i.word)).toEqual(['apple', 'ant', 'ball'])
    expect(items[0].letter).toBe('A')
    expect(items[2].letter).toBe('B')
  })

  it('derives letter from first char when no header, and dedupes', () => {
    const items = parseLetterGrouped('apple\napple\nball')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ word: 'apple', letter: 'A' })
  })

  it('ignores numbers and junk', () => {
    expect(parseLetterGrouped('123\n!!!\n').length).toBe(0)
  })
})
