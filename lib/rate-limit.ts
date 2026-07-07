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

// NOTE: most routes call checkRateLimit(userId, tier) WITHOUT an endpoint, so they all share
// one bucket per tier (e.g. every "standard" write shares `standard:default`). These limits are
// therefore per-USER-across-the-whole-app, not per-route — they must be generous enough for an
// active teacher (many saves/loads per session) while still capping abuse.
const RATE_LIMITS: Record<
  RateLimitTier,
  { tokens: number; window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}` }
> = {
  strict: { tokens: 40, window: '1 h' }, // expensive AI (generation/extraction) — bounds cost
  standard: { tokens: 300, window: '1 h' }, // writes (saves, edits, notifies)
  relaxed: { tokens: 1000, window: '1 h' }, // reads
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
    // Fail CLOSED in production: missing Redis config must not silently unthrottle the app.
    // Dev/test stay open so local work doesn't require Upstash.
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        headers: {
          'X-RateLimit-Limit': '0',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(Date.now() + 60000).toISOString(),
        },
      }
    }
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
