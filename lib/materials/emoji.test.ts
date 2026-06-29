import { describe, it, expect } from 'vitest'
import { wordToEmoji, isEmoji, sanitizeEmoji } from './emoji'

describe('isEmoji / sanitizeEmoji', () => {
  it('accepts real emoji', () => {
    expect(isEmoji('🐜')).toBe(true)
    expect(isEmoji('🦉')).toBe(true)
    expect(isEmoji('👨‍🚀')).toBe(true) // ZWJ sequence
    expect(isEmoji('➡️')).toBe(true) // arrow + variation selector
  })
  it('rejects stray letters / text (the h/v/n bug)', () => {
    expect(isEmoji('h')).toBe(false)
    expect(isEmoji('v')).toBe(false)
    expect(isEmoji('apple')).toBe(false)
    expect(isEmoji('')).toBe(false)
    expect(isEmoji(null)).toBe(false)
    expect(isEmoji(undefined)).toBe(false)
  })
  it('sanitizeEmoji keeps valid, drops invalid', () => {
    expect(sanitizeEmoji('🍎')).toBe('🍎')
    expect(sanitizeEmoji('h')).toBeUndefined()
    expect(sanitizeEmoji('')).toBeUndefined()
  })
})

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
