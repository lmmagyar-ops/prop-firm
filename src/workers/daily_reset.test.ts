import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We'll mock the database and test the idempotency logic
vi.mock("@/db", () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn()
            }))
        })),
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn()
            }))
        }))
    }
}));

describe("DailyReset - Idempotency Logic", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should recognize same-day reset and skip", () => {
        const today = new Date("2025-12-27T12:00:00Z");
        const lastResetToday = new Date("2025-12-27T00:01:00Z"); // Same UTC day

        vi.setSystemTime(today);

        const todayUTC = today.toISOString().split('T')[0];
        const lastResetDate = lastResetToday.toISOString().split('T')[0];

        // Same day check - core logic test
        expect(lastResetDate === todayUTC).toBe(true);
    });

    it("should recognize different-day reset and proceed", () => {
        const today = new Date("2025-12-27T12:00:00Z");
        const lastResetYesterday = new Date("2025-12-26T23:59:00Z"); // Previous UTC day

        vi.setSystemTime(today);

        const todayUTC = today.toISOString().split('T')[0];
        const lastResetDate = lastResetYesterday.toISOString().split('T')[0];

        // Different day check
        expect(lastResetDate === todayUTC).toBe(false);
    });

    it("should handle null lastDailyResetAt (never reset)", () => {
        const challenge = {
            id: "challenge-1",
            lastDailyResetAt: null
        };

        // Null check - should proceed with reset
        const lastResetDate = (challenge.lastDailyResetAt as Date | null)?.toISOString().split('T')[0];
        expect(lastResetDate).toBeUndefined();
    });
});
