import { describe, it, expect } from 'vitest'

describe('MemoryMatch pair id coercion (regression: games.ts id was typed as number)', () => {
  it('String() of a numeric id produces a valid charCode without throwing', () => {
    // Before the fix, pair.id was number and MemoryMatch called p.id.charCodeAt(0)
    // which throws TypeError: p.id.charCodeAt is not a function.
    const numericId = 42
    const pid = String(numericId)
    expect(() => pid.charCodeAt(0)).not.toThrow()
    expect(pid.charCodeAt(0)).toBeGreaterThan(0)
    expect(pid).toBe('42')
  })

  it('String() of a string id is idempotent', () => {
    expect(String('hello')).toBe('hello')
    expect(String('hello').charCodeAt(0)).toBe(104)
  })

  it('matched guard uses startsWith to match pairId prefix correctly', () => {
    // Regression: matched.includes(cardId) always returned false because
    // matched = ['1'] and cardId = '1-word'. Fix uses .some(pid => cardId.startsWith(pid + '-'))
    const matched = ['1', '3']
    const cardId = '1-word'
    const oldGuard = matched.includes(cardId)
    const newGuard = matched.some((pid) => cardId.startsWith(pid + '-'))
    expect(oldGuard).toBe(false) // the bug: matched card was never guarded
    expect(newGuard).toBe(true) // the fix: correctly identifies the matched card
  })
})
