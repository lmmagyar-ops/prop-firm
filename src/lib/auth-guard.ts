import { auth } from '@/auth';
import { db } from '@/db';
import { challenges } from '@/db/schema';
import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';

export type AuthResult = {
    userId: string;
    session: Session;
};

export type AuthError = {
    error: string;
    status: number;
};

/**
 * Validates that a request has a valid authenticated session.
 * Returns the userId on success, or an error response on failure.
 */
export async function requireAuth(): Promise<AuthResult | AuthError> {
    const session = await auth();

    if (!session?.user?.id) {
        return {
            error: 'Unauthorized',
            status: 401,
        };
    }

    return {
        userId: session.user.id,
        session: session as Session,
    };
}

/**
 * Helper to check if auth result is an error
 */
export function isAuthError(result: AuthResult | AuthError): result is AuthError {
    return 'error' in result;
}

/**
 * Creates an error response from an AuthError
 */
export function authErrorResponse(error: AuthError): NextResponse {
    return NextResponse.json({ error: error.error }, { status: error.status });
}

/**
 * Validates that a challenge belongs to the authenticated user.
 * Returns the challenge on success, or null if not found/unauthorized.
 */
export async function validateChallengeOwnership(
    challengeId: string,
    userId: string
): Promise<typeof challenges.$inferSelect | null> {
    const challenge = await db.query.challenges.findFirst({
        where: (challenges, { eq, and }) => and(
            eq(challenges.id, challengeId),
            eq(challenges.userId, userId)
        ),
    });

    return challenge ?? null;
}

/**
 * Note: For admin checks, use requireAdmin from '@/lib/admin-auth' instead.
 * That implementation uses the database role field for proper access control.
 */

/**
 * Validates that a challenge exists and is in an active/funded state.
 */
export async function requireActiveChallenge(
    challengeId: string,
    userId: string
): Promise<typeof challenges.$inferSelect | AuthError> {
    const challenge = await validateChallengeOwnership(challengeId, userId);

    if (!challenge) {
        return {
            error: 'Challenge not found',
            status: 404,
        };
    }

    if (challenge.status !== 'active') {
        return {
            error: 'Challenge is not active',
            status: 400,
        };
    }

    return challenge;
}

/**
 * Type guard for challenge validation result
 */
export function isChallengeError(
    result: typeof challenges.$inferSelect | AuthError
): result is AuthError {
    return 'error' in result;
}
