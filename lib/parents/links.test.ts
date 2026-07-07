import { describe, it, expect } from 'vitest'
import { mintInviteToken, linkStatus, canClaim, grantsAccess } from './links'

const NOW = new Date('2026-07-06T12:00:00Z')
const future = '2026-07-10T00:00:00Z'
const past = '2026-07-01T00:00:00Z'

describe('mintInviteToken', () => {
  it('is 32 hex chars, unique', () => {
    const a = mintInviteToken()
    expect(a).toMatch(/^[a-f0-9]{32}$/)
    expect(mintInviteToken()).not.toBe(a)
  })
})

describe('linkStatus', () => {
  it('pendiente: unclaimed, unexpired', () => {
    expect(linkStatus({ expires_at: future, claimed_at: null, revoked_at: null }, NOW)).toBe(
      'pendiente'
    )
  })
  it('activo: claimed', () => {
    expect(linkStatus({ expires_at: past, claimed_at: past, revoked_at: null }, NOW)).toBe(
      'activo' // expiry only gates the UNCLAIMED invite, not an established link
    )
  })
  it('expirado: unclaimed past expiry', () => {
    expect(linkStatus({ expires_at: past, claimed_at: null, revoked_at: null }, NOW)).toBe(
      'expirado'
    )
  })
  it('revocado wins over everything', () => {
    expect(linkStatus({ expires_at: future, claimed_at: past, revoked_at: past }, NOW)).toBe(
      'revocado'
    )
  })
})

describe('canClaim / grantsAccess', () => {
  it('only pendiente is claimable', () => {
    expect(canClaim({ expires_at: future, claimed_at: null, revoked_at: null }, NOW)).toBe(true)
    expect(canClaim({ expires_at: past, claimed_at: null, revoked_at: null }, NOW)).toBe(false)
    expect(canClaim({ expires_at: future, claimed_at: past, revoked_at: null }, NOW)).toBe(false)
    expect(canClaim({ expires_at: future, claimed_at: null, revoked_at: past }, NOW)).toBe(false)
  })
  it('only activo grants access', () => {
    expect(grantsAccess({ expires_at: past, claimed_at: past, revoked_at: null }, NOW)).toBe(true)
    expect(grantsAccess({ expires_at: future, claimed_at: null, revoked_at: null }, NOW)).toBe(
      false
    )
    expect(grantsAccess({ expires_at: past, claimed_at: past, revoked_at: past }, NOW)).toBe(false)
  })
})
