// lib/api-keys.ts
// Utilities for generating and validating per-user API keys

import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * Generates a new API key with format: mk_<48 hex chars>
 * Total length: 53 characters (mk_ + 50 hex)
 *
 * Example: mk_a1b2c3d4e5f6789012345678901234567890123456789012
 */
export function generateApiKey(): string {
  return 'mk_' + crypto.randomBytes(25).toString('hex') // 53 chars total
}

/**
 * Hashes an API key using bcrypt (cost factor 10)
 * Use this before storing in database
 */
export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10)
}

/**
 * Verifies an API key against a stored bcrypt hash
 * Use this to authenticate API requests
 */
export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash)
}

/**
 * Extracts the display prefix from an API key
 * Shows first 11 characters + ellipsis for security
 *
 * Example: mk_a1b2c3d4e5f6... (from mk_a1b2c3d4e5f6789012...)
 */
export function getKeyPrefix(key: string): string {
  return key.slice(0, 11) + '...'
}

/**
 * Extracts just the prefix for database storage
 * First 11 characters only (no ellipsis)
 */
export function extractKeyPrefix(key: string): string {
  return key.slice(0, 11)
}
