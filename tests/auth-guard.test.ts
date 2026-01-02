import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireAdmin, validateChallengeOwnership, requireActiveChallenge, isAuthError, isChallengeError } from '@/lib/auth-guard';

// Mock NextAuth
vi.mock('@/auth', () => ({
    auth: vi.fn(),
}));

// Mock database
vi.mock('@/db', () => ({
    db: {
        query: {
            challenges: {
                findFirst: vi.fn(),
            },
        },
    },
}));

import { auth } from '@/auth';
import { db } from '@/db';

describe('Authentication Guards', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('requireAuth()', () => {
        it('should block unauthenticated users (no session)', async () => {
            vi.mocked(auth).mockResolvedValue(null);

            const result = await requireAuth();

            expect(isAuthError(result)).toBe(true);
            if (isAuthError(result)) {
                expect(result.error).toBe('Unauthorized');
                expect(result.status).toBe(401);
            }
        });

        it('should block users with invalid session (no user ID)', async () => {
            vi.mocked(auth).mockResolvedValue({
                user: { email: 'test@test.com' }, // No ID
                expires: '2025-12-31',
            } as any);

            const result = await requireAuth();

            expect(isAuthError(result)).toBe(true);
            if (isAuthError(result)) {
                expect(result.error).toBe('Unauthorized');
                expect(result.status).toBe(401);
            }
        });

        it('should allow authenticated users with valid session', async () => {
            const mockSession = {
                user: { id: 'user-123', email: 'test@test.com' },
                expires: '2025-12-31',
            };
            vi.mocked(auth).mockResolvedValue(mockSession as any);

            const result = await requireAuth();

            expect(isAuthError(result)).toBe(false);
            if (!isAuthError(result)) {
                expect(result.userId).toBe('user-123');
                expect(result.session).toEqual(mockSession);
            }
        });
    });

    describe('validateChallengeOwnership()', () => {
        it('should prevent cross-user access (challenge owned by different user)', async () => {
            vi.mocked(db.query.challenges.findFirst).mockResolvedValue(null);

            const result = await validateChallengeOwnership('challenge-123', 'user-456');

            expect(result).toBeNull();
        });

        it('should allow owner access (challenge owned by user)', async () => {
            const mockChallenge = {
                id: 'challenge-123',
                userId: 'user-123',
                status: 'active',
                currentBalance: '10000',
            };
            vi.mocked(db.query.challenges.findFirst).mockResolvedValue(mockChallenge as any);

            const result = await validateChallengeOwnership('challenge-123', 'user-123');

            expect(result).toEqual(mockChallenge);
        });
    });

    describe('requireActiveChallenge()', () => {
        it('should reject if challenge not found', async () => {
            vi.mocked(db.query.challenges.findFirst).mockResolvedValue(null);

            const result = await requireActiveChallenge('challenge-123', 'user-123');

            expect(isChallengeError(result)).toBe(true);
            if (isChallengeError(result)) {
                expect(result.error).toBe('Challenge not found');
                expect(result.status).toBe(404);
            }
        });

        it('should reject inactive challenges (status not active)', async () => {
            const mockChallenge = {
                id: 'challenge-123',
                userId: 'user-123',
                status: 'failed', // Not active
                currentBalance: '8000',
            };
            vi.mocked(db.query.challenges.findFirst).mockResolvedValue(mockChallenge as any);

            const result = await requireActiveChallenge('challenge-123', 'user-123');

            expect(isChallengeError(result)).toBe(true);
            if (isChallengeError(result)) {
                expect(result.error).toBe('Challenge is not active');
                expect(result.status).toBe(400);
            }
        });

        it('should allow active challenges', async () => {
            const mockChallenge = {
                id: 'challenge-123',
                userId: 'user-123',
                status: 'active',
                currentBalance: '12000',
            };
            vi.mocked(db.query.challenges.findFirst).mockResolvedValue(mockChallenge as any);

            const result = await requireActiveChallenge('challenge-123', 'user-123');

            expect(isChallengeError(result)).toBe(false);
            if (!isChallengeError(result)) {
                expect(result).toEqual(mockChallenge);
            }
        });
    });

    describe('requireAdmin()', () => {
        it('should block non-admin users (invalid email domain)', async () => {
            const mockSession = {
                user: { id: 'user-123', email: 'user@gmail.com' }, // Not admin
                expires: '2025-12-31',
            };
            vi.mocked(auth).mockResolvedValue(mockSession as any);

            const result = await requireAdmin();

            expect(isAuthError(result)).toBe(true);
            if (isAuthError(result)) {
                expect(result.error).toBe('Forbidden - Admin access required');
                expect(result.status).toBe(403);
            }
        });

        it('should allow admin users (valid email domain)', async () => {
            const mockSession = {
                user: { id: 'admin-123', email: 'admin@yourcompany.com' }, // Admin
                expires: '2025-12-31',
            };
            vi.mocked(auth).mockResolvedValue(mockSession as any);

            const result = await requireAdmin();

            expect(isAuthError(result)).toBe(false);
            if (!isAuthError(result)) {
                expect(result.userId).toBe('admin-123');
                expect(result.session).toEqual(mockSession);
            }
        });

        it('should block unauthenticated users trying to access admin routes', async () => {
            vi.mocked(auth).mockResolvedValue(null);

            const result = await requireAdmin();

            expect(isAuthError(result)).toBe(true);
            if (isAuthError(result)) {
                expect(result.error).toBe('Unauthorized');
                expect(result.status).toBe(401);
            }
        });
    });
});
