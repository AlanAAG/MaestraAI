/**
 * CSRF Protection — double-submit HMAC token pattern.
 *
 * NOTE: The primary CSRF defense is the Origin-header host-match check in
 * middleware.ts (applied to every state-mutating /api/* request).
 * This module provides an additional token-based layer for forms that
 * want an extra guarantee.
 *
 * CSRF_SECRET is REQUIRED in production. Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import crypto from 'crypto'

const secret = process.env.CSRF_SECRET

if (!secret && process.env.NODE_ENV === 'production') {
  // Fail loudly in production rather than silently using a predictable fallback
  throw new Error('[CSRF] CSRF_SECRET environment variable is required in production.')
}

// Ephemeral random secret for development (regenerated each cold-start, that's fine)
const _secret = secret ?? crypto.randomBytes(32).toString('hex')

export function generateCsrfToken(): string {
  const nonce = crypto.randomBytes(32).toString('hex')
  const sig = crypto.createHmac('sha256', _secret).update(nonce).digest('hex')
  return `${nonce}.${sig}`
}

export function verifyCsrfToken(token: string): boolean {
  if (!token) return false
  try {
    const dotIdx = token.lastIndexOf('.')
    if (dotIdx === -1) return false
    const nonce = token.slice(0, dotIdx)
    const sig = token.slice(dotIdx + 1)
    const expected = crypto.createHmac('sha256', _secret).update(nonce).digest('hex')
    const expectedBuf = Buffer.from(expected, 'hex')
    const sigBuf = Buffer.from(sig, 'hex')
    if (expectedBuf.length !== sigBuf.length) return false
    return crypto.timingSafeEqual(expectedBuf, sigBuf)
  } catch {
    return false
  }
}

export async function verifyCsrfFromRequest(req: Request): Promise<boolean> {
  const headerToken = req.headers.get('x-csrf-token')
  if (headerToken && verifyCsrfToken(headerToken)) return true
  try {
    const cloned = req.clone()
    const ct = cloned.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) {
      const body = await cloned.json()
      return verifyCsrfToken(body.csrf_token)
    }
    if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
      const fd = await cloned.formData()
      return verifyCsrfToken(fd.get('csrf_token') as string)
    }
  } catch {
    // ignore
  }
  return false
}

export function generateCsrfSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}
