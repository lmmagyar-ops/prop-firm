import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChallengeEvaluator } from "./evaluator";
import { db } from "@/db";

// Mock dependencies
vi.mock("@/db", () => ({
    db: {
        query: {
            challenges: {
                findFirst: vi.fn()
            },
            positions: {
                findMany: vi.fn()
            }
        },
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn()
            }))
        }))
    }
}));

vi.mock("./events", () => ({
    publishAdminEvent: vi.fn()
}));

vi.mock("./market", () => ({
    MarketService: {
        getLatestPrice: vi.fn(() => ({ price: "0.50" })),
        getBatchOrderBookPrices: vi.fn((marketIds: string[]) => {
            // Return a Map with price "0.50" for all requested markets
            const map = new Map();
            marketIds.forEach(id => map.set(id, { price: "0.50", source: "mock" }));
            return map;
        })
    }
}));

describe("ChallengeEvaluator - Daily Loss Pending Failure", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // --- DAILY LOSS triggers pending_failure (max drawdown is immediate fail) ---

    it("should set pendingFailureAt on daily loss breach", async () => {
        const breachedChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "9500", // Daily loss = $500, limit = 4% of $10k = $400
            startingBalance: "10000",
            highWaterMark: "10000",
            startOfDayBalance: "10000",
            rulesConfig: { maxDrawdown: 1000, maxDailyDrawdownPercent: 0.04 },
            pendingFailureAt: null,
            endsAt: null
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(breachedChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-1");

        // Daily loss triggers pending_failure
        expect(result.status).toBe("pending_failure");
        expect(result.reason).toContain("Daily loss");
        expect(db.update).toHaveBeenCalled();
    });

    it("should clear pendingFailureAt if user recovers from daily loss", async () => {
        const recoveredChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "9700", // Daily loss = $300, under $400 limit
            startingBalance: "10000",
            highWaterMark: "10000",
            startOfDayBalance: "10000",
            rulesConfig: { maxDrawdown: 1000, maxDailyDrawdownPercent: 0.04 },
            pendingFailureAt: new Date(), // Was pending
            endsAt: null
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(recoveredChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-1");

        // Should return active (recovered)
        expect(result.status).toBe("active");
        // Verify pendingFailureAt was cleared
        expect(db.update).toHaveBeenCalled();
    });

    it("should fail immediately on max drawdown breach (not pending_failure)", async () => {
        const drawdownChallenge = {
            id: "challenge-2",
            status: "active",
            currentBalance: "8900", // Drawdown = $1100, max = $1000
            startingBalance: "10000",
            highWaterMark: "10000",
            startOfDayBalance: "10000",
            rulesConfig: { maxDrawdown: 1000, maxDailyDrawdownPercent: 0.04 },
            pendingFailureAt: null,
            endsAt: null
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(drawdownChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-2");

        // Max drawdown triggers immediate failure
        expect(result.status).toBe("failed");
        expect(result.reason).toContain("drawdown");
    });

    // --- PASS CONDITION TESTS ---

    it("should pass challenge when equity exceeds profit target", async () => {
        const winningChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "11100", // Above $10,500 target
            startingBalance: "10000",
            highWaterMark: "10000",
            startOfDayBalance: "10000",
            rulesConfig: { profitTarget: 500, maxDrawdown: 500 },
            pendingFailureAt: null,
            endsAt: null,
            phase: "challenge",
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(winningChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-1");

        expect(result.status).toBe("passed");
    });
});

// --- NEW: CORE EVALUATION RULES ---

describe("ChallengeEvaluator - Max Drawdown", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should fail when drawdown from HWM exceeds maxDrawdown", async () => {
        const drawdownChallenge = {
            id: "challenge-dd",
            status: "active",
            currentBalance: "8900", // $1100 below HWM of $10k (maxDrawdown = $1000)
            startingBalance: "10000",
            highWaterMark: "10000",
            startOfDayBalance: "10000",
            rulesConfig: { profitTarget: 1000, maxDrawdown: 1000 },
            pendingFailureAt: null,
            endsAt: null,
            phase: "challenge",
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(drawdownChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-dd");

        expect(result.status).toBe("failed");
        expect(result.reason).toContain("drawdown");
    });

    it("should remain active when drawdown is below threshold", async () => {
        const safeChallenge = {
            id: "challenge-safe",
            status: "active",
            currentBalance: "9800", // $200 below HWM (under $1000 drawdown limit)
            startingBalance: "10000",
            highWaterMark: "10000",
            startOfDayBalance: "9800", // Same as current, no daily loss
            rulesConfig: { profitTarget: 1000, maxDrawdown: 1000, maxDailyDrawdownPercent: 0.04 },
            pendingFailureAt: null,
            endsAt: null,
            phase: "challenge",
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(safeChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-safe");

        expect(result.status).toBe("active");
    });
});

describe("ChallengeEvaluator - Time Expiry", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should fail when current time is past endsAt", async () => {
        const now = new Date("2024-01-15T12:00:00Z");
        const expiredAt = new Date("2024-01-14T12:00:00Z"); // Yesterday

        vi.setSystemTime(now);

        const expiredChallenge = {
            id: "challenge-expired",
            status: "active",
            currentBalance: "10000",
            startingBalance: "10000",
            highWaterMark: "10000",
            startOfDayBalance: "10000",
            rulesConfig: { profitTarget: 1000, maxDrawdown: 1000 },
            pendingFailureAt: null,
            endsAt: expiredAt,
            phase: "challenge",
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(expiredChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-expired");

        expect(result.status).toBe("failed");
        expect(result.reason).toContain("Time");
    });
});

describe("ChallengeEvaluator - NO Position Handling", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should calculate NO position value as shares * (1 - yesPrice)", async () => {
        const challenge = {
            id: "challenge-no",
            status: "active",
            currentBalance: "9700", // Cash balance
            startingBalance: "10000",
            highWaterMark: "10000",
            startOfDayBalance: "9700", // Same as current to avoid daily loss
            rulesConfig: {
                profitTarget: 1000,
                maxDrawdown: 1000,
                maxDailyDrawdownPercent: 0.04
            },
            pendingFailureAt: null,
            endsAt: null,
            phase: "challenge",
        };

        // NO position: 100 shares
        // MarketService mock returns { price: "0.50" } (YES price)
        // NO value = 100 * (1 - 0.50) = 100 * 0.50 = $50
        // Total equity = $9700 + $50 = $9750
        const noPosition = {
            id: "pos-1",
            marketId: "test-market",
            direction: "NO",
            shares: "100",
            currentPrice: "0.30", // This is ignored when MarketService returns data
            entryPrice: "0.30",
            status: "OPEN",
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([noPosition as any]);
        // MarketService returns { price: "0.50" } so equity = 9700 + (100 * 0.50) = 9750

        const result = await ChallengeEvaluator.evaluate("challenge-no");

        // Should be active because within limits
        expect(result.status).toBe("active");
        // Equity = cash + NO position value = 9700 + (100 * 0.50) = 9750
        expect(result.equity).toBeCloseTo(9750, 0);
    });
});

describe("ChallengeEvaluator - Phase Transition", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should transition from challenge to funded when profit target hit", async () => {
        const passingChallenge = {
            id: "challenge-pass",
            status: "active",
            currentBalance: "11100", // $1100 profit (target = $1000)
            startingBalance: "10000",
            highWaterMark: "10000",
            startOfDayBalance: "10000",
            rulesConfig: { profitTarget: 1000, maxDrawdown: 1000 },
            pendingFailureAt: null,
            endsAt: null,
            phase: "challenge", // In challenge phase
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(passingChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-pass");

        expect(result.status).toBe("passed");
        expect(result.reason).toContain("FUNDED");
        // Verify db.update was called to transition phase
        expect(db.update).toHaveBeenCalled();
    });

    it("should update high water mark when equity increases", async () => {
        const growingChallenge = {
            id: "challenge-grow",
            status: "active",
            currentBalance: "10500", // Above HWM of $10k but below profit target
            startingBalance: "10000",
            highWaterMark: "10000",
            startOfDayBalance: "10000",
            rulesConfig: { profitTarget: 1000, maxDrawdown: 1000 },
            pendingFailureAt: null,
            endsAt: null,
            phase: "challenge",
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(growingChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-grow");

        expect(result.status).toBe("active");
        // Verify HWM update was called
        expect(db.update).toHaveBeenCalled();
    });
});

// === FUNDED PHASE TESTS ===

describe("ChallengeEvaluator - Funded Phase Static Drawdown", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should use STATIC drawdown from initial balance (not HWM) for funded accounts", async () => {
        // Funded with $10k initial, current balance = $9200
        // HWM = $11000 (profit was made, then lost)
        // Static drawdown = $10000 - $9200 = $800 (under $1000 limit)
        // If it used HWM trailing: $11000 - $9200 = $1800 (would fail)
        const fundedChallenge = {
            id: "funded-1",
            status: "active",
            phase: "funded",              // FUNDED phase
            currentBalance: "9200",       // $800 below starting
            startingBalance: "10000",
            highWaterMark: "11000",       // Was at $11k profit before dropping
            startOfDayBalance: "9500",
            rulesConfig: {
                maxDrawdown: 1000,        // $1000 max drawdown from INITIAL
                maxDailyDrawdownPercent: 0.05
            },
            pendingFailureAt: null,
            endsAt: null,
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(fundedChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("funded-1");

        // Should REMAIN ACTIVE because static drawdown from $10k is only $800
        // NOT failed because we don't use HWM ($1800 drawdown from $11k)
        expect(result.status).toBe("active");
    });

    it("should fail when static drawdown from initial balance exceeds limit", async () => {
        const fundedChallenge = {
            id: "funded-2",
            status: "active",
            phase: "funded",
            currentBalance: "8900",       // $1100 below starting = OVER limit
            startingBalance: "10000",
            highWaterMark: "10500",
            startOfDayBalance: "9000",
            rulesConfig: {
                maxDrawdown: 1000,        // Only $1000 allowed
                maxDailyDrawdownPercent: 0.05
            },
            pendingFailureAt: null,
            endsAt: null,
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(fundedChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("funded-2");

        expect(result.status).toBe("failed");
        expect(result.reason).toContain("drawdown");
    });

    it("should NOT check profit target for funded accounts", async () => {
        // Funded accounts never "pass" again - they accumulate profit for payouts
        // Even at massive profit, status stays "active"
        const profitableFunded = {
            id: "funded-3",
            status: "active",
            phase: "funded",
            currentBalance: "15000",      // 50% profit!
            startingBalance: "10000",
            highWaterMark: "15000",
            startOfDayBalance: "14500",
            rulesConfig: {
                profitTarget: 1000,       // Would "pass" if this were checked
                maxDrawdown: 1000,
                maxDailyDrawdownPercent: 0.05
            },
            pendingFailureAt: null,
            endsAt: null,
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(profitableFunded as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("funded-3");

        // Should remain ACTIVE, not "passed"
        expect(result.status).toBe("active");
        expect(result.status).not.toBe("passed");
    });

    it("should still fail funded accounts on daily loss violation", async () => {
        const dailyLossFunded = {
            id: "funded-4",
            status: "active",
            phase: "funded",
            currentBalance: "9400",       // $600 loss from SOD ($10k)
            startingBalance: "10000",
            highWaterMark: "10000",
            startOfDayBalance: "10000",   // 6% daily loss (over 5%)
            rulesConfig: {
                maxDrawdown: 1000,
                maxDailyDrawdownPercent: 0.05  // 5% daily limit = $500
            },
            pendingFailureAt: null,
            endsAt: null,
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(dailyLossFunded as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("funded-4");

        // Should trigger pending_failure or failure due to daily loss
        expect(["failed", "pending_failure"]).toContain(result.status);
    });
});

describe("ChallengeEvaluator - Tier Detection on Phase Transition", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should apply 5k tier rules for $5000 starting balance", async () => {
        const challenge5k = {
            id: "challenge-5k",
            status: "active",
            phase: "challenge",
            currentBalance: "5600",       // $600 profit (above $500 target for 5k)
            startingBalance: "5000",
            highWaterMark: "5600",
            startOfDayBalance: "5000",
            rulesConfig: {
                profitTarget: 500,        // 10% of $5k
                maxDrawdown: 400          // 8% of $5k
            },
            pendingFailureAt: null,
            endsAt: null,
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge5k as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-5k");

        // Should transition to funded
        expect(result.status).toBe("passed");
    });

    it("should apply 10k tier rules for $10000 starting balance", async () => {
        const challenge10k = {
            id: "challenge-10k",
            status: "active",
            phase: "challenge",
            currentBalance: "11100",      // $1100 profit (above $1000 target)
            startingBalance: "10000",
            highWaterMark: "11100",
            startOfDayBalance: "10000",
            rulesConfig: {
                profitTarget: 1000,       // 10% of $10k
                maxDrawdown: 1000
            },
            pendingFailureAt: null,
            endsAt: null,
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge10k as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-10k");

        expect(result.status).toBe("passed");
    });

    it("should apply 25k tier rules for $25000 starting balance", async () => {
        const challenge25k = {
            id: "challenge-25k",
            status: "active",
            phase: "challenge",
            currentBalance: "27600",      // $2600 profit (above $2500 target)
            startingBalance: "25000",
            highWaterMark: "27600",
            startOfDayBalance: "25000",
            rulesConfig: {
                profitTarget: 2500,       // 10% of $25k
                maxDrawdown: 2500
            },
            pendingFailureAt: null,
            endsAt: null,
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge25k as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-25k");

        expect(result.status).toBe("passed");
    });
});

describe("ChallengeEvaluator - Edge Cases", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should fail when exactly at drawdown limit (no buffer)", async () => {
        // Business rule: >= means at-limit is a failure (no grace)
        const atLimitChallenge = {
            id: "at-limit",
            status: "active",
            phase: "funded",
            currentBalance: "9000",       // Exactly $1000 drawdown = AT limit
            startingBalance: "10000",
            highWaterMark: "10000",
            startOfDayBalance: "9500",
            rulesConfig: {
                maxDrawdown: 1000,        // Exactly at limit
                maxDailyDrawdownPercent: 0.05
            },
            pendingFailureAt: null,
            endsAt: null,
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(atLimitChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("at-limit");

        // At limit = FAILED (>= check, no buffer at limit)
        expect(result.status).toBe("failed");
    });

    it("should fail when just over drawdown limit", async () => {
        const overLimitChallenge = {
            id: "over-limit",
            status: "active",
            phase: "funded",
            currentBalance: "8999",       // $1001 drawdown = OVER limit
            startingBalance: "10000",
            highWaterMark: "10000",
            startOfDayBalance: "9500",
            rulesConfig: {
                maxDrawdown: 1000,
                maxDailyDrawdownPercent: 0.05
            },
            pendingFailureAt: null,
            endsAt: null,
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(overLimitChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("over-limit");

        expect(result.status).toBe("failed");
    });
});

