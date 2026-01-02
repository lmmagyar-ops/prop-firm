import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAdmin } from '@/lib/admin-auth';

// Mock NextAuth
vi.mock('@/auth', () => ({
    auth: vi.fn(),
}));

// Mock database
vi.mock('@/db', () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn(() => ({
                    limit: vi.fn(() => Promise.resolve([])),
                })),
            })),
        })),
    },
}));

import { auth } from '@/auth';
import { db } from '@/db';

describe('Admin Authorization', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('requireAdmin()', () => {
        it('should allow admin users via database role', async () => {
            const mockSession = {
                user: { id: 'admin-123', email: 'admin@example.com' },
            };
            vi.mocked(auth).mockResolvedValue(mockSession as any);

            // Mock DB to return admin role
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn(() => ({
                    where: vi.fn(() => ({
                        limit: vi.fn(() => Promise.resolve([{ role: 'admin', isActive: true }])),
                    })),
                })),
            } as any);

            const result = await requireAdmin();

            expect(result.isAuthorized).toBe(true);
            expect(result.user).toEqual(mockSession.user);
        });

        it('should allow bootstrap admin users (fallback)', async () => {
            const mockSession = {
                user: { id: 'admin-123', email: 'l.m.magyar@gmail.com' }, // Bootstrap admin
            };
            vi.mocked(auth).mockResolvedValue(mockSession as any);

            // Mock DB to return no user (fallback to bootstrap)
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn(() => ({
                    where: vi.fn(() => ({
                        limit: vi.fn(() => Promise.resolve([])), // No DB record
                    })),
                })),
            } as any);

            const result = await requireAdmin();

            expect(result.isAuthorized).toBe(true);
            expect(result.user).toEqual(mockSession.user);
        });

        it('should reject non-admin users (no admin role)', async () => {
            const mockSession = {
                user: { id: 'user-123', email: 'user@example.com' },
            };
            vi.mocked(auth).mockResolvedValue(mockSession as any);

            // Mock DB to return regular user (not admin)
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn(() => ({
                    where: vi.fn(() => ({
                        limit: vi.fn(() => Promise.resolve([{ role: 'user', isActive: true }])),
                    })),
                })),
            } as any);

            const result = await requireAdmin();

            expect(result.isAuthorized).toBe(false);
            expect(result.response).toBeDefined();
        });

        it('should reject suspended admin accounts', async () => {
            const mockSession = {
                user: { id: 'admin-123', email: 'admin@example.com' },
            };
            vi.mocked(auth).mockResolvedValue(mockSession as any);

            // Mock DB to return suspended admin
            vi.mocked(db.select).mockReturnValue({
                from: vi.fn(() => ({
                    where: vi.fn(() => ({
                        limit: vi.fn(() => Promise.resolve([{ role: 'admin', isActive: false }])), // Suspended
                    })),
                })),
            } as any);

            const result = await requireAdmin();

            expect(result.isAuthorized).toBe(false);
            expect(result.response).toBeDefined();
        });

        it('should reject unauthenticated requests', async () => {
            vi.mocked(auth).mockResolvedValue(null); // No session

            const result = await requireAdmin();

            expect(result.isAuthorized).toBe(false);
            expect(result.response).toBeDefined();
        });
    });
});
