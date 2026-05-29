/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * Generates and verifies CSRF tokens for form submissions
 * Prevents malicious websites from making unauthorized requests
 */

import Tokens from 'csrf'
import crypto from 'crypto'

const tokens = new Tokens()

// Secret should be a long random string stored in environment variables
const secret = process.env.CSRF_SECRET || 'fallback-secret-change-in-production'

if (!process.env.CSRF_SECRET) {
  console.warn('WARNING: CSRF_SECRET not set in environment variables')
}

/**
 * Generate a CSRF token
 *
 * Usage in server components:
 * ```typescript
 * const csrfToken = generateCsrfToken()
 * return <form>
 *   <input type="hidden" name="csrf_token" value={csrfToken} />
 * </form>
 * ```
 */
export function generateCsrfToken(): string {
  return tokens.create(secret)
}

/**
 * Verify a CSRF token from form submission
 *
 * Usage in API routes:
 * ```typescript
 * const formData = await req.formData()
 * const token = formData.get('csrf_token') as string
 *
 * if (!verifyCsrfToken(token)) {
 *   return new Response('Invalid CSRF token', { status: 403 })
 * }
 * ```
 */
export function verifyCsrfToken(token: string): boolean {
  if (!token) return false

  try {
    return tokens.verify(secret, token)
  } catch {
    return false
  }
}

/**
 * Middleware helper to verify CSRF token from request
 *
 * Usage in API routes:
 * ```typescript
 * const csrfValid = await verifyCsrfFromRequest(req)
 * if (!csrfValid) {
 *   return new Response('CSRF validation failed', { status: 403 })
 * }
 * ```
 */
export async function verifyCsrfFromRequest(req: Request): Promise<boolean> {
  // Check for token in header (for AJAX requests)
  const headerToken = req.headers.get('x-csrf-token')
  if (headerToken && verifyCsrfToken(headerToken)) {
    return true
  }

  // Check for token in form data (for form submissions)
  // Clone the request so the body can be read again by the API route
  try {
    const clonedReq = req.clone()
    const contentType = clonedReq.headers.get('content-type')

    if (contentType?.includes('application/json')) {
      const body = await clonedReq.json()
      const token = body.csrf_token
      return verifyCsrfToken(token)
    }

    if (
      contentType?.includes('multipart/form-data') ||
      contentType?.includes('application/x-www-form-urlencoded')
    ) {
      const formData = await clonedReq.formData()
      const token = formData.get('csrf_token') as string
      return verifyCsrfToken(token)
    }

    return false
  } catch {
    return false
  }
}

/**
 * Generate a secure random secret for CSRF token generation
 *
 * Run this once to generate a secret for your .env file:
 * ```
 * node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * ```
 */
export function generateCsrfSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}
