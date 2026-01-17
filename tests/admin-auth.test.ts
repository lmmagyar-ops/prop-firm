import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Set bootstrap admin email BEFORE importing the module
beforeAll(() => {
    vi.stubEnv('ADMIN_BOOTSTRAP_EMAILS', 'l.m.magyar@gmail.com,test-admin@example.com');
});

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

// Import after mocks are set up
import { auth } from '@/auth';
import { db } from '@/db';

// Dynamically import requireAdmin to pick up the env var
async function getRequireAdmin() {
    // Clear module cache to pick up new env vars
    const mod = await import('@/lib/admin-auth');
    return mod.requireAdmin;
}

describe('Admin Authorization', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('requireAdmin()', () => {
        it('should allow admin users via database role', async () => {
            const requireAdmin = await getRequireAdmin();

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

        it('should reject non-admin users (no admin role)', async () => {
            const requireAdmin = await getRequireAdmin();

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
            const requireAdmin = await getRequireAdmin();

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
            const requireAdmin = await getRequireAdmin();

            vi.mocked(auth).mockResolvedValue(null as any); // No session

            const result = await requireAdmin();

            expect(result.isAuthorized).toBe(false);
            expect(result.response).toBeDefined();
        });
    });
});
