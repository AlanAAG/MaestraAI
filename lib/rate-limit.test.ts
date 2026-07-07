// Verifies the fail-closed branch: no Upstash config + production → requests are denied.
// (Redis env is absent in the test environment, so checkRateLimit hits the no-limiter path.)
import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('checkRateLimit without Redis', () => {
  it('fails CLOSED in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    const { checkRateLimit } = await import('./rate-limit')
    const { success } = await checkRateLimit('user-1', 'standard')
    expect(success).toBe(false)
  })

  it('fails OPEN outside production', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    const { checkRateLimit } = await import('./rate-limit')
    const { success } = await checkRateLimit('user-1', 'standard')
    expect(success).toBe(true)
  })
})
