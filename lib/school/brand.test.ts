import { describe, expect, it } from 'vitest'
import { resolveSingleSchool } from './brand'

describe('resolveSingleSchool', () => {
  it('returns the id when all children share one school', () => {
    expect(resolveSingleSchool(['s1', 's1', 's1'])).toBe('s1')
  })
  it('ignores null/undefined entries', () => {
    expect(resolveSingleSchool(['s1', null, undefined, 's1'])).toBe('s1')
  })
  it('returns null for mixed schools or no schools', () => {
    expect(resolveSingleSchool(['s1', 's2'])).toBeNull()
    expect(resolveSingleSchool([])).toBeNull()
    expect(resolveSingleSchool([null, undefined])).toBeNull()
  })
})
