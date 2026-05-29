/**
 * Rate Limiting with Upstash Redis
 *
 * Tier-based sliding window rate limits:
 * - strict: 10 requests/hour (AI generation, file uploads)
 * - standard: 50 requests/hour (API writes)
 * - relaxed: 100 requests/hour (API reads)
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Check if Redis is configured (required for production)
const isRedisConfigured = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN

// Initialize Redis connection (reads from env vars)
// If not configured, rate limiting will be disabled (dev mode)
const redis = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Warn in development if Redis is not configured
if (!isRedisConfigured && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[Rate Limit] Upstash Redis not configured. Rate limiting is DISABLED in development mode.'
  )
}

// Rate limit configuration by tier
type RateLimitTier = 'strict' | 'standard' | 'relaxed'

const RATE_LIMITS: Record<
  RateLimitTier,
  { tokens: number; window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}` }
> = {
  strict: { tokens: 10, window: '1 h' }, // AI generation, file uploads
  standard: { tokens: 50, window: '1 h' }, // API writes (POST/PATCH/DELETE)
  relaxed: { tokens: 100, window: '1 h' }, // API reads (GET)
}

/**
 * Create a rate limiter for a specific tier
 */
export function createRateLimit(tier: RateLimitTier) {
  const { tokens, window } = RATE_LIMITS[tier]

  // If Redis is not configured, return null (graceful degradation)
  if (!redis) {
    return null
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true, // Enable Upstash analytics dashboard
    prefix: `maestraai:ratelimit:${tier}`, // Namespace by tier
  })
}

/**
 * Check rate limit for a user/identifier
 *
 * @param identifier - User ID, IP address, or API key
 * @param tier - Rate limit tier
 * @returns Object with success flag and rate limit headers
 */
export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier
): Promise<{
  success: boolean
  headers: Record<string, string>
}> {
  const limiter = createRateLimit(tier)

  // If rate limiting is disabled (dev mode without Redis), allow all requests
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

/**
 * Get rate limit tier for a specific endpoint
 *
 * Use this to determine which tier to apply in API routes
 */
export function getRateLimitTier(endpoint: string, method: string): RateLimitTier {
  // Strict tier: AI generation and file uploads
  const strictEndpoints = [
    '/api/planner/generate',
    '/api/materials/generate',
    '/api/diary/summarize',
    '/api/vocabulary/extract',
    '/api/richmond/parse-csv',
    '/api/richmond/import-batch',
    '/api/resources/upload',
  ]

  if (strictEndpoints.some((path) => endpoint.includes(path))) {
    return 'strict'
  }

  // Relaxed tier: GET requests
  if (method === 'GET') {
    return 'relaxed'
  }

  // Standard tier: all other writes
  return 'standard'
}
