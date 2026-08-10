// Short code a child's game profile shows so a parent can claim it once in /familia.
// Ambiguous glyphs (0/O, 1/I) are excluded — a 5-year-old reads this out loud to their mom.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function mintPlayerCode(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

/** Uppercase + strip spaces/dashes so "ab c-d 2f" typed by a parent still matches. */
export function normalizePlayerCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export const PLAYER_CODE_RE = /^[A-Z0-9]{6}$/
