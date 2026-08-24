import { describe, expect, it } from 'vitest'
import { isActive } from './announcements'

describe('isActive', () => {
  const now = '2026-08-24T12:00:00.000Z'
  it('no expiry → active', () => {
    expect(isActive({ expires_at: null }, now)).toBe(true)
  })
  it('future expiry → active', () => {
    expect(isActive({ expires_at: '2026-09-01T00:00:00.000Z' }, now)).toBe(true)
  })
  it('past expiry → inactive', () => {
    expect(isActive({ expires_at: '2026-08-01T00:00:00.000Z' }, now)).toBe(false)
  })
})
