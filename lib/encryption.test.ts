import { describe, it, expect, beforeAll } from 'vitest'

// 32-byte key as 64 hex chars
beforeAll(() => {
  process.env.ENCRYPTION_KEY = 'a'.repeat(64)
})

describe('encryption', () => {
  it('round-trips plaintext (diary q1..q5, richmond_scores names)', async () => {
    const { encrypt, decrypt } = await import('./encryption')
    const secret = 'Aitana mostró gran avance en lectura. 👧'
    const cipher = await encrypt(secret)
    expect(cipher).not.toBe(secret)
    expect(await decrypt(cipher)).toBe(secret)
  })

  it('decrypt throws on non-ciphertext — backfill relies on this to detect plaintext', async () => {
    const { decrypt } = await import('./encryption')
    await expect(decrypt('just some plaintext that was never encrypted')).rejects.toThrow()
  })
})
