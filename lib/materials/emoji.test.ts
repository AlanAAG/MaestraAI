import { describe, it, expect } from 'vitest'
import { wordToEmoji } from './emoji'

describe('wordToEmoji', () => {
  it('maps common words and normalizes casing/articles', () => {
    expect(wordToEmoji('cat')).toBe('🐱')
    expect(wordToEmoji('  Apple ')).toBe('🍎')
    expect(wordToEmoji('a dog')).toBe('🐶')
    expect(wordToEmoji('the SUN')).toBe('☀️')
  })

  it('handles simple plurals', () => {
    expect(wordToEmoji('cats')).toBe('🐱')
    expect(wordToEmoji('boxes')).toBe(wordToEmoji('box') ?? null) // no 'box' entry → consistent
    expect(wordToEmoji('butterflies')).toBe('🦋')
  })

  it('returns null for unmapped words (player falls back to image/text)', () => {
    expect(wordToEmoji('quetzalcoatl')).toBeNull()
    expect(wordToEmoji('')).toBeNull()
  })
})
