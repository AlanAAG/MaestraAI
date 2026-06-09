import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const isRedisConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)

const redis = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Always warn when Redis is absent — including production
if (!isRedisConfigured) {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[Rate Limit] CRITICAL: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set. ' +
        'All AI endpoints are UNTHROTTLED. Set these in Vercel environment variables immediately.'
    )
  } else {
    console.warn('[Rate Limit] Redis not configured — rate limiting disabled in dev mode.')
  }
}

type RateLimitTier = 'strict' | 'standard' | 'relaxed'

const RATE_LIMITS: Record<
  RateLimitTier,
  { tokens: number; window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}` }
> = {
  strict: { tokens: 10, window: '1 h' },
  standard: { tokens: 50, window: '1 h' },
  relaxed: { tokens: 100, window: '1 h' },
}

/**
 * Create a rate limiter namespaced by tier + endpoint.
 * Passing an endpoint ensures each AI route has its own independent bucket
 * (teachers get 10 lesson plans/hr AND 10 material sets/hr, not 10 total).
 */
export function createRateLimit(tier: RateLimitTier, endpoint = 'default') {
  if (!redis) return null
  const { tokens, window } = RATE_LIMITS[tier]
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
    prefix: `maestraai:ratelimit:${tier}:${endpoint}`,
  })
}

export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier,
  endpoint = 'default'
): Promise<{ success: boolean; headers: Record<string, string> }> {
  const limiter = createRateLimit(tier, endpoint)

  if (!limiter) {
    return {
      success: true,
      headers: {
        'X-RateLimit-Limit': '999999',
        'X-RateLimit-Remaining': '999999',
        'X-RateLimit-Reset': new Date(Date.now() + 3600000).toISOString(),
      },
    }
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier)
  return {
    success,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
    },
  }
}

export function getRateLimitTier(endpoint: string, method: string): RateLimitTier {
  const strictEndpoints = [
    '/api/planner/generate',
    '/api/materials/generate',
    '/api/diary/summarize',
    '/api/vocabulary/extract',
    '/api/richmond/parse-csv',
    '/api/richmond/import-batch',
    '/api/resources/upload',
  ]
  if (strictEndpoints.some((p) => endpoint.includes(p))) return 'strict'
  if (method === 'GET') return 'relaxed'
  return 'standard'
}
