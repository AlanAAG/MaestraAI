// lib/richmond/crypto.ts
import { createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Decrypts a Richmond session cookie.
 * Input: base64(iv + authTag + ciphertext)
 */
export async function decryptSession(encryptedData: string): Promise<string> {
  const key = getEncryptionKey()
  const combined = Buffer.from(encryptedData, 'base64')

  // Extract iv, authTag, and encrypted data
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, undefined, 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Gets the Richmond encryption key from environment.
 * Must be 32 bytes (64 hex characters).
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.RICHMOND_ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error('RICHMOND_ENCRYPTION_KEY is not set')
  }
  if (keyHex.length !== 64) {
    throw new Error('RICHMOND_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  return Buffer.from(keyHex, 'hex')
}
