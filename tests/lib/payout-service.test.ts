import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (paths must match how payout-service.ts imports them) ─────
vi.mock("@/db", () => {
    const selectFn = vi.fn();
    const fromFn = vi.fn();
    const whereFn = vi.fn();
    const insertFn = vi.fn();
    const valuesFn = vi.fn();
    const updateFn = vi.fn();
    const setFn = vi.fn();

    selectFn.mockReturnValue({ from: fromFn });
    fromFn.mockReturnValue({ where: whereFn });
    whereFn.mockResolvedValue([]);
    insertFn.mockReturnValue({ values: valuesFn });
    valuesFn.mockResolvedValue(undefined);
    updateFn.mockReturnValue({ set: setFn });
    setFn.mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });

    return {
        db: {
            select: selectFn,
            insert: insertFn,
            update: updateFn,
            query: { positions: { findMany: vi.fn().mockResolvedValue([]) } },
        },
    };
});

vi.mock("@/db/schema", () => ({
    challenges: { id: "id", phase: "phase", status: "status", userId: "userId" },
    payouts: { id: "id", challengeId: "challengeId", status: "status" },
    positions: { challengeId: "challengeId", status: "status", closedAt: "closedAt" },
    trades: {},
}));

vi.mock("nanoid", () => ({ nanoid: () => "test-payout-id-01" }));

const { mockGetExcludedPnL } = vi.hoisted(() => ({
    mockGetExcludedPnL: vi.fn().mockResolvedValue({ totalExcluded: 0, excludedPositions: [] }),
}));

vi.mock("@/lib/resolution-detector", () => ({
    ResolutionDetector: {
        getExcludedPnL: mockGetExcludedPnL,
    },
}));

vi.mock("@/lib/polymarket-oracle", () => ({
    PolymarketOracle: {
        getResolutionStatus: vi.fn().mockResolvedValue({ isResolved: false, source: "fallback" }),
    },
}));

// ── Imports (AFTER mocks) ───────────────────────────────────────────
import { PayoutService } from "@/lib/payout-service";
import { db } from "@/db";

// ── Helpers ─────────────────────────────────────────────────────────
function mkChallenge(overrides: Record<string, any> = {}) {
    return {
        id: "ch-001",
        userId: "user-001",
        phase: "funded",
        status: "active",
        currentBalance: "11000.00",
        startingBalance: "10000.00",
        activeTradingDays: 7,
        consistencyFlagged: false,
        payoutCycleStart: new Date("2026-01-01"),
        startedAt: new Date("2025-12-01"),
        totalPaidOut: "0.00",
        payoutCap: null,
        profitSplit: "0.80",
        lastPayoutAt: null,
        rulesConfig: null,
        ...overrides,
    };
}

/** Wire the DB mock to return a specific challenge for select().from().where() */
function mockDbChallenge(challenge: any) {
    const where = vi.fn().mockResolvedValue([challenge]);
    const from = vi.fn().mockReturnValue({ where });
    (db.select as any).mockReturnValue({ from });
}

/** Wire two consecutive select calls: first for challenge, second for payouts */
function mockDbChallengeAndPayouts(challenge: any, existingPayouts: any[] = []) {
    let callCount = 0;
    (db.select as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
            return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(challenge ? [challenge] : []) }) };
        }
        return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(existingPayouts) }) };
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    mockGetExcludedPnL.mockResolvedValue({ totalExcluded: 0, excludedPositions: [] });
});

// =====================================================================
// checkEligibility
// =====================================================================
describe("PayoutService.checkEligibility", () => {
    it("returns eligible for valid funded challenge with profit and enough days", async () => {
        mockDbChallengeAndPayouts(mkChallenge());

        const result = await PayoutService.checkEligibility("ch-001");

        expect(result.eligible).toBe(true);
        expect(result.netProfit).toBe(1000);
        expect(result.activeTradingDays).toBe(7);
        expect(result.consistencyFlagged).toBe(false);
    });

    it("rejects non-funded phase", async () => {
        mockDbChallengeAndPayouts(mkChallenge({ phase: "challenge" }));

        const result = await PayoutService.checkEligibility("ch-001");

        expect(result.eligible).toBe(false);
        expect(result.reasons).toContainEqual(expect.stringContaining("Not a funded account"));
    });

    it("rejects inactive status", async () => {
        mockDbChallengeAndPayouts(mkChallenge({ status: "failed" }));

        const result = await PayoutService.checkEligibility("ch-001");

        expect(result.eligible).toBe(false);
        expect(result.reasons).toContainEqual(expect.stringContaining("not active"));
    });

    it("rejects zero profit", async () => {
        mockDbChallengeAndPayouts(mkChallenge({ currentBalance: "10000.00" }));

        const result = await PayoutService.checkEligibility("ch-001");

        expect(result.eligible).toBe(false);
        expect(result.reasons).toContainEqual(expect.stringContaining("No net profit"));
    });

    it("rejects negative profit (balance below starting)", async () => {
        mockDbChallengeAndPayouts(mkChallenge({ currentBalance: "9500.00" }));

        const result = await PayoutService.checkEligibility("ch-001");

        expect(result.eligible).toBe(false);
        expect(result.netProfit).toBe(-500);
    });

    it("rejects insufficient trading days for $5k tier", async () => {
        mockDbChallengeAndPayouts(
            mkChallenge({ startingBalance: "5000.00", currentBalance: "5500.00", activeTradingDays: 2 })
        );

        const result = await PayoutService.checkEligibility("ch-001");

        expect(result.eligible).toBe(false);
        expect(result.reasons).toContainEqual(expect.stringContaining("Insufficient trading days"));
    });

    it("blocks when existing payout is in progress", async () => {
        mockDbChallengeAndPayouts(mkChallenge(), [{ id: "pay-001", status: "pending" }]);

        const result = await PayoutService.checkEligibility("ch-001");

        expect(result.eligible).toBe(false);
        expect(result.reasons).toContainEqual(expect.stringContaining("already in progress"));
    });

    it("treats consistency flag as soft — does NOT block eligibility", async () => {
        mockDbChallengeAndPayouts(mkChallenge({ consistencyFlagged: true }));

        const result = await PayoutService.checkEligibility("ch-001");

        expect(result.eligible).toBe(true);
        expect(result.consistencyFlagged).toBe(true);
        expect(result.reasons).toContainEqual(expect.stringContaining("Consistency flag"));
    });

    it("returns challenge not found", async () => {
        mockDbChallengeAndPayouts(null);

        const result = await PayoutService.checkEligibility("ch-nonexistent");

        expect(result.eligible).toBe(false);
        expect(result.reasons).toContain("Challenge not found");
    });

    it("rejects with multiple failures together", async () => {
        mockDbChallengeAndPayouts(
            mkChallenge({ phase: "challenge", status: "failed", currentBalance: "8000.00", activeTradingDays: 1 })
        );

        const result = await PayoutService.checkEligibility("ch-001");

        expect(result.eligible).toBe(false);
        expect(result.reasons.length).toBeGreaterThanOrEqual(3);
    });
});

// =====================================================================
// calculatePayout
// =====================================================================
describe("PayoutService.calculatePayout", () => {
    it("calculates 80/20 split correctly", async () => {
        mockDbChallenge(mkChallenge());

        const result = await PayoutService.calculatePayout("ch-001");

        expect(result.grossProfit).toBe(1000);
        expect(result.excludedPnl).toBe(0);
        expect(result.adjustedProfit).toBe(1000);
        expect(result.profitSplit).toBe(0.80);
        expect(result.netPayout).toBe(800);
        expect(result.firmShare).toBe(200);
    });

    it("calculates 90/10 split for upgraded accounts", async () => {
        mockDbChallenge(mkChallenge({ profitSplit: "0.90" }));

        const result = await PayoutService.calculatePayout("ch-001");

        expect(result.netPayout).toBe(900);
        expect(result.firmShare).toBe(100);
    });

    it("deducts resolution-excluded P&L", async () => {
        mockDbChallenge(mkChallenge({ currentBalance: "12000.00" }));
        mockGetExcludedPnL.mockResolvedValue({
            totalExcluded: 500,
            excludedPositions: [{ positionId: "pos-1", marketId: "m-1", pnl: 500, reason: "Resolution" }],
        });

        const result = await PayoutService.calculatePayout("ch-001");

        expect(result.grossProfit).toBe(2000);
        expect(result.excludedPnl).toBe(500);
        expect(result.adjustedProfit).toBe(1500);
        expect(result.netPayout).toBeCloseTo(1200); // 1500 * 0.80
    });

    it("enforces payout cap", async () => {
        mockDbChallenge(mkChallenge({
            currentBalance: "30000.00",
            payoutCap: "5000.00",
        }));

        const result = await PayoutService.calculatePayout("ch-001");

        expect(result.grossProfit).toBe(20000);
        expect(result.cappedProfit).toBe(5000);
        expect(result.netPayout).toBe(4000); // 5000 * 0.80
    });

    it("handles zero profit gracefully", async () => {
        mockDbChallenge(mkChallenge({ currentBalance: "10000.00" }));

        const result = await PayoutService.calculatePayout("ch-001");

        expect(result.grossProfit).toBe(0);
        expect(result.netPayout).toBe(0);
        expect(result.firmShare).toBe(0);
    });

    it("clamps negative profit to zero (loss positions)", async () => {
        mockDbChallenge(mkChallenge({ currentBalance: "9000.00" }));

        const result = await PayoutService.calculatePayout("ch-001");

        expect(result.grossProfit).toBe(0);
        expect(result.netPayout).toBe(0);
    });

    it("throws when challenge not found", async () => {
        (db.select as any).mockReturnValue({
            from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
        });

        await expect(PayoutService.calculatePayout("nonexistent")).rejects.toThrow("Challenge not found");
    });

    it("uses startingBalance as cap when payoutCap is null", async () => {
        mockDbChallenge(mkChallenge({
            currentBalance: "30000.00",
            payoutCap: null,
        }));

        const result = await PayoutService.calculatePayout("ch-001");

        // payoutCap falls back to startingBalance (10000)
        expect(result.payoutCap).toBe(10000);
        expect(result.cappedProfit).toBe(10000);
        expect(result.netPayout).toBe(8000); // 10000 * 0.80
    });
});

// =====================================================================
// getFundedTier (private, test via eligibility behavior)
// =====================================================================
describe("PayoutService — tier selection via eligibility", () => {
    it("maps $5k balance to 5k tier (minTradingDays = 5)", async () => {
        mockDbChallengeAndPayouts(
            mkChallenge({ startingBalance: "5000.00", currentBalance: "5500.00", activeTradingDays: 4 })
        );

        const result = await PayoutService.checkEligibility("ch-001");

        // 4 < 5 minTradingDays for 5k tier → blocked
        expect(result.eligible).toBe(false);
        expect(result.reasons).toContainEqual(expect.stringContaining("4/5"));
    });

    it("maps $10k balance to 10k tier", async () => {
        mockDbChallengeAndPayouts(
            mkChallenge({ startingBalance: "10000.00", currentBalance: "10500.00", activeTradingDays: 4 })
        );

        const result = await PayoutService.checkEligibility("ch-001");

        // 10k tier uses same minTradingDays (5) — 4 < 5 → blocked
        expect(result.eligible).toBe(false);
        expect(result.reasons).toContainEqual(expect.stringContaining("Insufficient trading days"));
    });

    it("maps $25k+ balance to 25k tier", async () => {
        mockDbChallengeAndPayouts(
            mkChallenge({ startingBalance: "25000.00", currentBalance: "26000.00", activeTradingDays: 7 })
        );

        const result = await PayoutService.checkEligibility("ch-001");

        expect(result.eligible).toBe(true);
    });
});

// =====================================================================
// State machine transitions
// =====================================================================
describe("PayoutService — state machine", () => {
    it("approvePayout requires pending status", async () => {
        (db.select as any).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ id: "pay-001", status: "processing" }]),
            }),
        });

        await expect(PayoutService.approvePayout("pay-001", "admin-1")).rejects.toThrow(
            "expected 'pending'"
        );
    });

    it("markProcessing requires approved status", async () => {
        (db.select as any).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ id: "pay-001", status: "pending" }]),
            }),
        });

        await expect(PayoutService.markProcessing("pay-001")).rejects.toThrow(
            "expected 'approved'"
        );
    });

    it("completePayout requires processing status", async () => {
        (db.select as any).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
            }),
        });

        await expect(PayoutService.completePayout("pay-001", "0xabc")).rejects.toThrow(
            "not found or not in 'processing'"
        );
    });

    it("failPayout rejects terminal states (completed)", async () => {
        (db.select as any).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ id: "pay-001", status: "completed" }]),
            }),
        });

        await expect(PayoutService.failPayout("pay-001", "test")).rejects.toThrow(
            "already terminal"
        );
    });

    it("failPayout rejects terminal states (failed)", async () => {
        (db.select as any).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ id: "pay-001", status: "failed" }]),
            }),
        });

        await expect(PayoutService.failPayout("pay-001", "test")).rejects.toThrow(
            "already terminal"
        );
    });

    it("failPayout throws on non-existent payout", async () => {
        (db.select as any).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
            }),
        });

        await expect(PayoutService.failPayout("nonexistent", "test")).rejects.toThrow(
            "not found"
        );
    });
});
