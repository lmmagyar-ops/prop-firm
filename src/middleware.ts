import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
    checkRateLimit,
    getClientIdentifier,
    getTierForPath,
    RATE_LIMITS
} from '@/lib/rate-limiter';

/**
 * Security headers to add to all responses
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY');

    // XSS protection (legacy but still useful)
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy
    response.headers.set(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=()'
    );

    return response;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Only apply rate limiting to API routes
    if (pathname.startsWith('/api')) {
        // Skip rate limiting for webhooks (external callbacks, need different protection)
        // and cron jobs (internal, protected by Vercel headers)
        if (
            pathname.startsWith('/api/webhooks') ||
            pathname.startsWith('/api/cron')
        ) {
            const response = NextResponse.next();
            return addSecurityHeaders(response);
        }

        // Get client identifier and rate limit tier
        const clientId = getClientIdentifier(request.headers);
        const tier = getTierForPath(pathname);

        // Check rate limit against Redis
        const { allowed, remaining, resetInSeconds } = await checkRateLimit(clientId, tier);
        const tierConfig = RATE_LIMITS[tier];

        if (!allowed) {
            return new NextResponse(
                JSON.stringify({
                    error: 'Too many requests',
                    tier,
                    retryAfter: resetInSeconds
                }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'Retry-After': resetInSeconds.toString(),
                        'X-RateLimit-Limit': tierConfig.limit.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Tier': tier,
                    },
                }
            );
        }

        const response = NextResponse.next();
        response.headers.set('X-RateLimit-Limit', tierConfig.limit.toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Tier', tier);
        return addSecurityHeaders(response);
    }

    // For non-API routes, just add security headers
    const response = NextResponse.next();
    return addSecurityHeaders(response);
}

export const config = {
    matcher: [
        // Match all routes except static files and images
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
