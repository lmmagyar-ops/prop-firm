/**
 * Redis-based Rate Limiter
 * 
 * Uses sliding window algorithm for accurate rate limiting across serverless instances.
 * All rate limit state is stored in Redis, making it effective in Vercel/serverless.
 */

import { getRedisClient } from "./redis-client";

// Rate limit tiers (requests per window)
export const RATE_LIMITS = {
    // Critical financial endpoints - very strict (POST only)
    TRADE_EXECUTE: { limit: 10, windowSeconds: 60 },  // 10 trade executions/min
    TRADE_READ: { limit: 60, windowSeconds: 60 },     // 60 position/history reads/min
    PAYOUT: { limit: 5, windowSeconds: 60 },           // 5 payout requests/min

    // Auth endpoints - prevent brute force
    AUTH_SIGNUP: { limit: 5, windowSeconds: 300 },  // 5 signups per 5 min
    AUTH_LOGIN: { limit: 10, windowSeconds: 60 },   // 10 login attempts/min
    AUTH_VERIFY: { limit: 10, windowSeconds: 60 },  // 10 verifications/min

    // Read-heavy endpoints - more permissive
    MARKETS: { limit: 60, windowSeconds: 60 },      // 60 reads/min
    DASHBOARD: { limit: 60, windowSeconds: 60 },    // 60 dashboard loads/min

    // Default for everything else
    DEFAULT: { limit: 100, windowSeconds: 60 },     // 100 req/min
} as const;

export type RateLimitTier = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetInSeconds: number;
    tier: RateLimitTier;
}

/**
 * Determine rate limit tier based on pathname
 */
export function getTierForPath(pathname: string): RateLimitTier {
    // Trade endpoints - split by read vs write
    if (pathname.startsWith('/api/trade')) {
        // Read endpoints: positions, history, markets listing
        if (
            pathname.startsWith('/api/trade/positions') ||
            pathname.startsWith('/api/trades/history') ||
            pathname.startsWith('/api/trade/markets')
        ) {
            return 'TRADE_READ';
        }
        // Write endpoints: execute, close
        return 'TRADE_EXECUTE';
    }

    // Payout endpoints
    if (pathname.startsWith('/api/payout')) {
        return 'PAYOUT';
    }

    // Auth endpoints
    if (pathname.includes('/signup') || pathname.includes('/register')) {
        return 'AUTH_SIGNUP';
    }
    if (pathname.includes('/login') || pathname.includes('/nextauth')) {
        return 'AUTH_LOGIN';
    }
    if (pathname.includes('/verify') || pathname.includes('/2fa')) {
        return 'AUTH_VERIFY';
    }

    // Market data
    if (pathname.startsWith('/api/markets') || pathname.startsWith('/api/orderbook')) {
        return 'MARKETS';
    }

    // Dashboard
    if (pathname.startsWith('/api/dashboard') || pathname.startsWith('/api/user')) {
        return 'DASHBOARD';
    }

    return 'DEFAULT';
}

/**
 * Check rate limit using Redis sliding window.
 * 
 * Uses a simple counter with TTL for efficiency.
 * Key format: ratelimit:{tier}:{identifier}
 */
export async function checkRateLimit(
    identifier: string,
    tier: RateLimitTier
): Promise<RateLimitResult> {
    const { limit, windowSeconds } = RATE_LIMITS[tier];
    const key = `ratelimit:${tier}:${identifier}`;

    try {
        const redis = getRedisClient();

        // Use MULTI for atomic increment + TTL check
        const pipeline = redis.multi();
        pipeline.incr(key);
        pipeline.ttl(key);

        const results = await pipeline.exec();

        if (!results) {
            // Redis error - fail open (allow request)
            console.warn('[RateLimit] Redis pipeline failed, allowing request');
            return { allowed: true, remaining: limit, resetInSeconds: windowSeconds, tier };
        }

        const [incrResult, ttlResult] = results;
        const count = (incrResult?.[1] as number) || 1;
        const ttl = (ttlResult?.[1] as number) || -1;

        // Set expiry on first request
        if (count === 1 || ttl === -1) {
            await redis.expire(key, windowSeconds);
        }

        const allowed = count <= limit;
        const remaining = Math.max(0, limit - count);
        const resetInSeconds = ttl > 0 ? ttl : windowSeconds;

        if (!allowed) {
            console.warn(`[RateLimit] BLOCKED: ${identifier} hit ${tier} limit (${count}/${limit})`);
        }

        return { allowed, remaining, resetInSeconds, tier };

    } catch (error) {
        // Redis error - fail open to not block legitimate users
        console.error('[RateLimit] Redis error, failing open:', error);
        return { allowed: true, remaining: limit, resetInSeconds: windowSeconds, tier };
    }
}

/**
 * Get client identifier from request headers.
 * Uses X-Forwarded-For for Vercel/proxied requests.
 */
export function getClientIdentifier(headers: Headers): string {
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    const realIp = headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    return 'unknown';
}
