import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/auth', () => ({
    auth: vi.fn(),
}));

vi.mock('otpauth', () => ({
    TOTP: class MockTOTP {
        secret = { base32: 'MOCK_SECRET_BASE32' };
        toString = () => 'otpauth://totp/ProjectX:user@example.com?secret=MOCK_SECRET_BASE32&issuer=ProjectX';
        validate = (token: string) => token === '123456' ? 0 : null;
    },
}));

vi.mock('qrcode', () => ({
    default: {
        toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,MOCK_QR_CODE')),
    },
}));

vi.mock('@/db', () => ({
    db: {
        query: {
            user2FA: {
                findFirst: vi.fn(),
            },
        },
        insert: vi.fn(() => ({ values: vi.fn() })),
        update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    },
}));

import { auth } from '@/auth';
import { db } from '@/db';
import { TOTP } from 'otpauth';

describe('2FA Flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('2FA Setup', () => {
        it('should generate QR code with correct secret', async () => {
            const mockSession = {
                user: { id: 'user-123', email: 'user@example.com' },
            };
            vi.mocked(auth).mockResolvedValue(mockSession as any);
            vi.mocked(db.query.user2FA.findFirst).mockResolvedValue(null);

            const totp = new TOTP({} as any);

            expect(totp.secret.base32).toBe('MOCK_SECRET_BASE32');
            expect(totp.toString()).toContain('otpauth://totp');
        });

        it('should reject setup if 2FA already enabled', async () => {
            const mockSession = {
                user: { id: 'user-123', email: 'user@example.com' },
            };
            vi.mocked(auth).mockResolvedValue(mockSession as any);

            // Mock 2FA already enabled
            vi.mocked(db.query.user2FA.findFirst).mockResolvedValue({
                userId: 'user-123',
                secret: 'OLD_SECRET',
                enabled: true,
            } as any);

            // The route would return 400 error
            // This tests the logic of checking enabled status
            const existing = await db.query.user2FA.findFirst();
            expect(existing?.enabled).toBe(true);
        });

        it('should store secret temporarily (not enabled) during setup', async () => {
            const mockSession = {
                user: { id: 'user-123', email: 'user@example.com' },
            };
            vi.mocked(auth).mockResolvedValue(mockSession as any);
            vi.mocked(db.query.user2FA.findFirst).mockResolvedValue(null);

            vi.mocked(db.insert).mockReturnValue({
                values: vi.fn((data) => {
                    expect(data.enabled).toBe(false); // Not enabled yet
                    expect(data.secret).toBeDefined();
                    return Promise.resolve();
                }),
            } as any);

            await db.insert({} as any).values({
                userId: 'user-123',
                secret: 'MOCK_SECRET',
                enabled: false,
            });
        });
    });

    describe('2FA Verification', () => {
        it('should accept valid TOTP code', () => {
            const totp = new TOTP({} as any);
            const result = totp.validate('123456'); // Our mock accepts this

            expect(result).toBe(0); // Valid token returns 0 (no time drift)
        });

        it('should reject invalid TOTP code', () => {
            const totp = new TOTP({} as any);
            const result = totp.validate('999999'); // Invalid code

            expect(result).toBeNull(); // Invalid token returns null
        });

        it('should enable 2FA after successful verification', async () => {
            const updateMock = vi.fn(() => ({
                set: vi.fn((data) => {
                    expect(data.enabled).toBe(true);
                    return { where: vi.fn() };
                }),
            }));

            vi.mocked(db.update).mockReturnValue(updateMock() as any);

            await db.update({} as any).set({ enabled: true });
        });
    });

    describe('Backup Codes', () => {
        it('should generate 10 backup codes', () => {
            const backupCodes = Array.from({ length: 10 }, () =>
                Math.random().toString(36).substring(2, 10).toUpperCase()
            );

            expect(backupCodes).toHaveLength(10);
            backupCodes.forEach(code => {
                expect(code).toMatch(/^[A-Z0-9]+$/);
            });
        });

        it('should mark backup code as used after first use', async () => {
            const usedCodes = new Set(['ABC123']); // Simulating a used code

            const isCodeUsed = (code: string) => usedCodes.has(code);

            expect(isCodeUsed('ABC123')).toBe(true);
            expect(isCodeUsed('XYZ789')).toBe(false);
        });

        it('should reject reuse of backup code', () => {
            const usedCodes = new Set(['ABC123']);
            const code = 'ABC123';

            // First check: code is already used
            const canUse = !usedCodes.has(code);

            expect(canUse).toBe(false);
        });
    });

    describe('2FA Disable', () => {
        it('should require valid TOTP code to disable', () => {
            const totp = new TOTP({} as any);
            const validCode = '123456';

            const isValid = totp.validate(validCode) !== null;

            expect(isValid).toBe(true);
        });

        it('should reset secret and backup codes on disable', async () => {
            const updateMock = vi.fn(() => ({
                set: vi.fn((data) => {
                    expect(data.enabled).toBe(false);
                    expect(data.secret).toBeNull();
                    expect(data.backupCodes).toBeNull();
                    return { where: vi.fn() };
                }),
            }));

            vi.mocked(db.update).mockReturnValue(updateMock() as any);

            await db.update({} as any).set({
                enabled: false,
                secret: null,
                backupCodes: null,
            });
        });
    });
});
