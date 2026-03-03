/**
 * ChallengeManager — DB Write Verification Tests
 *
 * Tests that ChallengeManager correctly writes to the database:
 * - createChallenge: correct phase, status, balance, duration
 * - getActiveChallenge: filters by active status
 * - failChallenge: sets status to "failed"
 *
 * MOCKING STRATEGY: We mock @/db (the DB boundary) because these tests
 * verify the VALUES passed to the DB, not the DB driver itself.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── MOCK DB ────────────────────────────────────────────────────────
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockValues = vi.fn();
const mockSet = vi.fn();
const mockWhere = vi.fn();
const mockReturning = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/db", () => ({
    db: {
        insert: (...args: unknown[]) => {
            mockInsert(...args);
            return { values: (...a: unknown[]) => { mockValues(...a); return { returning: () => mockReturning() }; } };
        },
        update: (...args: unknown[]) => {
            mockUpdate(...args);
            return { set: (...a: unknown[]) => { mockSet(...a); return { where: (...w: unknown[]) => { mockWhere(...w); return Promise.resolve(); } }; } };
        },
        select: () => ({
            from: (...args: unknown[]) => {
                mockFrom(...args);
                return { where: (...w: unknown[]) => { mockWhere(...w); return mockSelect(); } };
            },
        }),
    },
}));

vi.mock("@/lib/logger", () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }),
}));

// Import AFTER mocks are set up
import { ChallengeManager } from "@/lib/challenges";

// ─── TESTS ──────────────────────────────────────────────────────────

describe("ChallengeManager", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("createChallenge", () => {
        it("inserts with phase='challenge' and status='active'", async () => {
            const fakeChallenge = {
                id: "test-id",
                currentBalance: "10000",
            };
            mockReturning.mockResolvedValue([fakeChallenge]);

            await ChallengeManager.createChallenge("user-123");

            expect(mockValues).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: "user-123",
                    phase: "challenge",
                    status: "active",
                })
            );
        });

        it("sets startingBalance and currentBalance to $10,000", async () => {
            const fakeChallenge = { id: "test-id", currentBalance: "10000" };
            mockReturning.mockResolvedValue([fakeChallenge]);

            await ChallengeManager.createChallenge("user-123");

            expect(mockValues).toHaveBeenCalledWith(
                expect.objectContaining({
                    startingBalance: "10000",
                    currentBalance: "10000",
                })
            );
        });

        it("sets highWaterMark equal to startingBalance", async () => {
            const fakeChallenge = { id: "test-id", currentBalance: "10000" };
            mockReturning.mockResolvedValue([fakeChallenge]);

            await ChallengeManager.createChallenge("user-123");

            expect(mockValues).toHaveBeenCalledWith(
                expect.objectContaining({
                    highWaterMark: "10000",
                })
            );
        });

        it("sets endsAt to ~60 days from now", async () => {
            const fakeChallenge = { id: "test-id", currentBalance: "10000" };
            mockReturning.mockResolvedValue([fakeChallenge]);

            const before = Date.now();
            await ChallengeManager.createChallenge("user-123");

            const call = mockValues.mock.calls[0][0];
            const endsAt = call.endsAt as Date;
            const daysFromNow = (endsAt.getTime() - before) / (1000 * 60 * 60 * 24);

            // Should be approximately 60 days (within 1 day tolerance for test timing)
            expect(daysFromNow).toBeGreaterThan(59);
            expect(daysFromNow).toBeLessThan(61);
        });

        it("returns the created challenge", async () => {
            const fakeChallenge = { id: "test-id", currentBalance: "10000", status: "active" };
            mockReturning.mockResolvedValue([fakeChallenge]);

            const result = await ChallengeManager.createChallenge("user-123");

            expect(result).toEqual(fakeChallenge);
        });
    });

    describe("getActiveChallenge", () => {
        it("returns the active challenge from results", async () => {
            const challenges = [
                { id: "c1", status: "failed" },
                { id: "c2", status: "active" },
                { id: "c3", status: "passed" },
            ];
            mockSelect.mockResolvedValue(challenges);

            const result = await ChallengeManager.getActiveChallenge("user-123");

            expect(result).toEqual({ id: "c2", status: "active" });
        });

        it("returns undefined when no active challenge exists", async () => {
            mockSelect.mockResolvedValue([
                { id: "c1", status: "failed" },
            ]);

            const result = await ChallengeManager.getActiveChallenge("user-123");

            expect(result).toBeUndefined();
        });

        it("returns undefined for empty results", async () => {
            mockSelect.mockResolvedValue([]);

            const result = await ChallengeManager.getActiveChallenge("user-123");

            expect(result).toBeUndefined();
        });
    });

    describe("failChallenge", () => {
        it("sets status to 'failed'", async () => {
            await ChallengeManager.failChallenge("challenge-123", "Max drawdown breached");

            expect(mockSet).toHaveBeenCalledWith({ status: "failed" });
        });
    });
});
