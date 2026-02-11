/**
 * Rate Limiter via Worker HTTP API
 * 
 * Uses atomic increment via the worker's KV endpoint for rate limiting.
 * All state is managed by the worker's Redis connection (free private networking).
 */

import { kvIncr } from "./worker-client";

// Rate limit tiers (requests per window)
export const RATE_LIMITS = {
    // Critical financial endpoints - very strict (POST only)
    TRADE_EXECUTE: { limit: 10, windowSeconds: 60 },  // 10 trade executions/min
    TRADE_READ: { limit: 300, windowSeconds: 60 },    // 300 position/history reads/min (read-only, each page fires ~5 concurrent fetches)
    PAYOUT: { limit: 5, windowSeconds: 60 },           // 5 payout requests/min

    // Auth endpoints - prevent brute force
    AUTH_SIGNUP: { limit: 5, windowSeconds: 300 },  // 5 signups per 5 min
    AUTH_LOGIN: { limit: 10, windowSeconds: 60 },   // 10 login attempts/min
    AUTH_VERIFY: { limit: 10, windowSeconds: 60 },  // 10 verifications/min

    // Read-heavy endpoints - more permissive
    MARKETS: { limit: 300, windowSeconds: 60 },     // 300 reads/min (SSE + polling)
    DASHBOARD: { limit: 300, windowSeconds: 60 },   // 300 dashboard loads/min

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

// Financial tiers that must fail CLOSED when the worker is unreachable.
// If we can't verify the rate limit, we reject the request.
const FAIL_CLOSED_TIERS: ReadonlySet<RateLimitTier> = new Set([
    'TRADE_EXECUTE',
    'PAYOUT',
]);

/**
 * Check rate limit using worker's atomic increment endpoint.
 * The worker handles INCR + EXPIRE atomically in a pipeline.
 * 
 * Financial tiers (TRADE_EXECUTE, PAYOUT) fail CLOSED — if the worker is
 * unreachable, the request is rejected. This prevents trades from bypassing
 * rate limits during worker outages.
 * 
 * Read tiers (MARKETS, DASHBOARD, etc.) fail OPEN — a worker blip
 * shouldn't block page loads.
 */
export async function checkRateLimit(
    identifier: string,
    tier: RateLimitTier
): Promise<RateLimitResult> {
    const { limit, windowSeconds } = RATE_LIMITS[tier];
    const key = `ratelimit:${tier}:${identifier}`;

    try {
        // Atomic increment with TTL via worker HTTP
        const count = await kvIncr(key, windowSeconds);

        const allowed = count <= limit;
        const remaining = Math.max(0, limit - count);

        if (!allowed) {
            console.warn(`[RateLimit] BLOCKED: ${identifier} hit ${tier} limit (${count}/${limit})`);
        }

        return { allowed, remaining, resetInSeconds: windowSeconds, tier };

    } catch (error) {
        if (FAIL_CLOSED_TIERS.has(tier)) {
            // Financial path — reject the request when we can't verify the limit
            console.error(`[RateLimit] Worker unreachable, failing CLOSED for ${tier}:`, error);
            return { allowed: false, remaining: 0, resetInSeconds: windowSeconds, tier };
        }

        // Non-financial path — fail open to not block page loads
        console.error(`[RateLimit] Worker unreachable, failing open for ${tier}:`, error);
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
