// CRITICAL: ioredis uses Node.js TCP sockets, incompatible with Edge Runtime.
// Must use Node.js runtime, otherwise middleware crashes with MIDDLEWARE_INVOCATION_FAILED.
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
    checkRateLimit,
    getClientIdentifier,
    getTierForPath,
    RATE_LIMITS
} from '@/lib/rate-limiter';

/**
 * Content Security Policy — prevents XSS script injection.
 * 
 * On a financial platform, CSP is critical: it stops injected scripts
 * from stealing session tokens or manipulating trade actions.
 * 
 * 'unsafe-inline' for style-src is required by Next.js (styled-jsx).
 * connect-src allows Google OAuth and same-origin API/SSE calls.
 */
const CSP_DIRECTIVES = [
    "default-src 'self'",
    // Next.js requires 'unsafe-inline' — it injects inline <script> tags for
    // hydration, __NEXT_DATA__, and chunk loading. Without this, React never
    // hydrates and the page is completely non-interactive (zero event handlers).
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",         // Next.js styled-jsx requires inline
    "img-src 'self' data: blob: https://*.amazonaws.com https://*.polymarket.com",
    "font-src 'self'",
    "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
].join('; ');

/**
 * Security headers to add to all responses
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
    // Content Security Policy
    response.headers.set('Content-Security-Policy', CSP_DIRECTIVES);

    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // Prevent clickjacking (redundant with CSP frame-ancestors, but belt-and-suspenders)
    response.headers.set('X-Frame-Options', 'DENY');

    // XSS protection (legacy but still useful)
    response.headers.set('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    // HSTS — force HTTPS for 1 year, include subdomains
    response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
    );

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


