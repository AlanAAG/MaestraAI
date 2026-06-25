import { describe, it, expect } from 'vitest'
import { generateAllCards } from './bingo'
import { buildWordSearch } from './word-search'

const WORDS = ['cat', 'dog', 'sun', 'ball', 'fish', 'bird', 'tree', 'star', 'moon', 'frog']

describe('bingo', () => {
  it('rejects when there are fewer words than a card needs (no repeats)', () => {
    // 3×3 with free space needs 8 distinct words.
    expect(() => generateAllCards(['a', 'b', 'c'], 5, true, 3)).toThrow()
  })

  it('never repeats a word within a single card', () => {
    const { cards } = generateAllCards(WORDS, 6, true, 3)
    for (const { card } of cards) {
      const words = card.flat().filter((w) => w !== 'FREE')
      expect(new Set(words).size).toBe(words.length)
    }
  })
})

describe('word search (kinder)', () => {
  it('fills every cell and lists only placed words', () => {
    const res = buildWordSearch(WORDS, 'kinder')
    expect(res.grid.flat().every((c) => /^[A-Z]$/.test(c))).toBe(true)
    expect(res.words.length).toBeGreaterThan(0)
    expect(res.wordPaths?.length).toBe(res.words.length)
  })

  it('varies the layout for different vocabulary (real seed)', () => {
    const a = buildWordSearch(WORDS, 'kinder')
    const b = buildWordSearch(['apple', 'orange', 'grape', 'lemon', 'peach'], 'kinder')
    expect(JSON.stringify(a.grid)).not.toBe(JSON.stringify(b.grid))
  })
})
