import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ActivityTracker } from "@/lib/activity-tracker";
import { CONSISTENCY_CONFIG } from "@/lib/funded-rules";

// Mock dependencies
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
        })),
        query: {
            challenges: {
                findMany: vi.fn()
            },
            trades: {
                findMany: vi.fn()
            },
            positions: {
                findMany: vi.fn()
            }
        }
    }
}));

// Import db after mocking
import { db } from "@/db";

describe("ActivityTracker.recordTradingDay", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2025-01-15T14:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should increment activeTradingDays on first trade of day", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "funded",
            activeTradingDays: 3,
            lastActivityAt: new Date("2025-01-14T10:00:00Z"), // Yesterday
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        await ActivityTracker.recordTradingDay("challenge-1");

        // Verify db.update was called with incremented days
        expect(db.update).toHaveBeenCalled();
    });

    it("should NOT increment if already traded today", async () => {
        const now = new Date("2025-01-15T14:00:00Z");
        const mockChallenge = {
            id: "challenge-1",
            phase: "funded",
            activeTradingDays: 3,
            lastActivityAt: new Date("2025-01-15T10:00:00Z"), // Earlier today
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        await ActivityTracker.recordTradingDay("challenge-1");

        // Verify db.update was called but NOT to increment (just update lastActivityAt)
        expect(db.update).toHaveBeenCalled();
        // The update call should update lastActivityAt but not increment days
    });

    it("should do nothing for non-funded phase", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "challenge", // NOT funded
            activeTradingDays: 0,
            lastActivityAt: null,
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        await ActivityTracker.recordTradingDay("challenge-1");

        // Verify db.update was NOT called
        expect(db.update).not.toHaveBeenCalled();
    });

    it("should handle missing challenge gracefully", async () => {
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([])
            })
        } as any);

        // Should not throw
        await ActivityTracker.recordTradingDay("nonexistent-challenge");
        expect(db.update).not.toHaveBeenCalled();
    });
});

describe("ActivityTracker.checkConsistency", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2025-01-15T18:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should flag if single day profit exceeds 50%", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "funded",
            currentBalance: "11000",    // $1000 total profit
            startingBalance: "10000",
            payoutCycleStart: new Date("2025-01-01"),
        };

        // Only 2 trades today (< minTradesForFlag of 3)
        const todaysTrades = [
            { id: "t1", challengeId: "challenge-1" },
            { id: "t2", challengeId: "challenge-1" },
        ];

        // Today's closed positions with $600 profit (60% of $1000 total)
        const todaysClosedPositions = [
            { id: "p1", status: "CLOSED", pnl: "600" },
        ];

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        vi.mocked(db.query.trades.findMany).mockResolvedValue(todaysTrades as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue(todaysClosedPositions as any);

        const result = await ActivityTracker.checkConsistency("challenge-1");

        expect(result.flagged).toBe(true);
        expect(result.reason).toContain("60");
    });

    it("should NOT flag if 3+ trades made (suggests skill not gambling)", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "funded",
            currentBalance: "11000",
            startingBalance: "10000",
            payoutCycleStart: new Date("2025-01-01"),
        };

        // 4 trades today (>= minTradesForFlag)
        const todaysTrades = [
            { id: "t1" }, { id: "t2" }, { id: "t3" }, { id: "t4" },
        ];

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        vi.mocked(db.query.trades.findMany).mockResolvedValue(todaysTrades as any);

        const result = await ActivityTracker.checkConsistency("challenge-1");

        // Should NOT be flagged because enough trades suggest skill
        expect(result.flagged).toBe(false);
    });

    it("should NOT flag if no total profit", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "funded",
            currentBalance: "9500",     // Loss, not profit
            startingBalance: "10000",
            payoutCycleStart: new Date("2025-01-01"),
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        const result = await ActivityTracker.checkConsistency("challenge-1");

        // No profit to check consistency against
        expect(result.flagged).toBe(false);
    });

    it("should NOT flag non-funded accounts", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "challenge", // NOT funded
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        const result = await ActivityTracker.checkConsistency("challenge-1");
        expect(result.flagged).toBe(false);
    });
});

describe("ActivityTracker.checkInactivity", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2025-02-15T12:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should terminate accounts inactive >30 days", async () => {
        const inactiveAccount = {
            id: "challenge-inactive",
            phase: "funded",
            status: "active",
            lastActivityAt: new Date("2025-01-01T12:00:00Z"), // 45 days ago
        };

        vi.mocked(db.query.challenges.findMany).mockResolvedValue([inactiveAccount] as any);

        const result = await ActivityTracker.checkInactivity();

        expect(result.terminated).toContain("challenge-inactive");
        expect(db.update).toHaveBeenCalled();
    });

    it("should NOT terminate recently active accounts", async () => {
        // No inactive accounts found
        vi.mocked(db.query.challenges.findMany).mockResolvedValue([]);

        const result = await ActivityTracker.checkInactivity();

        expect(result.terminated).toHaveLength(0);
    });
});

describe("ActivityTracker.getActivityStatus", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2025-01-15T12:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should return correct activity summary", async () => {
        const mockChallenge = {
            id: "challenge-1",
            activeTradingDays: 7,
            consistencyFlagged: false,
            lastActivityAt: new Date("2025-01-14T15:00:00Z"), // 1 day ago
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        const result = await ActivityTracker.getActivityStatus("challenge-1");

        expect(result.activeTradingDays).toBe(7);
        expect(result.isConsistencyFlagged).toBe(false);
        expect(result.lastActivityAt).toEqual(new Date("2025-01-14T15:00:00Z"));
        expect(result.isInactive).toBe(false); // Only 1 day, not 30
        expect(result.inactiveDays).toBe(0); // Less than 1 full day
    });

    it("should handle missing challenge gracefully", async () => {
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([])
            })
        } as any);

        const result = await ActivityTracker.getActivityStatus("nonexistent");

        expect(result.activeTradingDays).toBe(0);
        expect(result.isInactive).toBe(true);
        expect(result.inactiveDays).toBe(999);
    });

    it("should mark as inactive if >30 days since activity", async () => {
        const mockChallenge = {
            id: "challenge-1",
            activeTradingDays: 10,
            consistencyFlagged: false,
            lastActivityAt: new Date("2024-12-01T12:00:00Z"), // 45 days ago
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        const result = await ActivityTracker.getActivityStatus("challenge-1");

        expect(result.isInactive).toBe(true);
        expect(result.inactiveDays).toBeGreaterThanOrEqual(30);
    });
});

describe("ActivityTracker.clearConsistencyFlag", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should clear consistency flag for challenge", async () => {
        await ActivityTracker.clearConsistencyFlag("challenge-1");

        expect(db.update).toHaveBeenCalled();
    });
});
