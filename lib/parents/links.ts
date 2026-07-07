// Pure helpers for parent_links — kept separate for testability.

export interface ParentLinkState {
  expires_at: string
  claimed_at: string | null
  revoked_at: string | null
  parent_auth_id?: string | null
}

export type LinkStatus = 'activo' | 'pendiente' | 'expirado' | 'revocado'

export function mintInviteToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export function linkStatus(link: ParentLinkState, now: Date = new Date()): LinkStatus {
  if (link.revoked_at) return 'revocado'
  if (link.claimed_at) return 'activo'
  if (new Date(link.expires_at) < now) return 'expirado'
  return 'pendiente'
}

/** An invite can be claimed only while pending (not revoked, not claimed, not expired). */
export function canClaim(link: ParentLinkState, now: Date = new Date()): boolean {
  return linkStatus(link, now) === 'pendiente'
}

/** A claimed link grants access only while active. */
export function grantsAccess(link: ParentLinkState, now: Date = new Date()): boolean {
  return linkStatus(link, now) === 'activo'
}
