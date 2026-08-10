import { describe, it, expect } from 'vitest'
import { mintPlayerCode, normalizePlayerCode, PLAYER_CODE_RE } from './player-code'

describe('player codes', () => {
  it('mints 6 unambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      const code = mintPlayerCode()
      expect(code).toMatch(PLAYER_CODE_RE)
      expect(code).not.toMatch(/[OI01]/) // glyphs a child would misread aloud
    }
  })

  it('normalizes what a parent actually types', () => {
    expect(normalizePlayerCode(' ab c-d 2f ')).toBe('ABCD2F')
    expect(normalizePlayerCode('abcd2f')).toMatch(PLAYER_CODE_RE)
  })
})
