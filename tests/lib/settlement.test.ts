/**
 * Settlement Service Tests
 *
 * Behavioral tests for market resolution settlement — the path where
 * real money changes hands. Tests the actual settleResolvedPositions()
 * function with mocked DB and Oracle dependencies.
 *
 * Critical behaviors verified:
 * 1. PnL formula: shares × (settlementPrice - entryPrice)
 * 2. NO direction inversion: settlementPrice = 1 - resolutionPrice
 * 3. Balance mutation via BalanceManager.adjustBalance
 * 4. Double-settlement guard (FOR UPDATE + status check)
 * 5. Ambiguous resolution → skip (don't fabricate prices)
 * 6. Error isolation — one failure doesn't block others
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ─────────────────────────────────────────────────────
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockExecute = vi.fn();

vi.mock("@/db", () => ({
    db: {
        query: {
            positions: { findMany: (...args: unknown[]) => mockFindMany(...args) },
        },
        transaction: vi.fn(async (cb: (tx: unknown) => Promise<void>) => {
            const tx = {
                execute: mockExecute,
                update: mockUpdate,
                insert: mockInsert,
            };
            await cb(tx);
        }),
    },
}));

// ── Mock schema (eq/and/sql need to be importable) ──────────────
vi.mock("@/db/schema", () => ({
    positions: { id: "id", status: "status", marketId: "marketId" },
    challenges: {},
    trades: {},
}));

vi.mock("drizzle-orm", () => ({
    eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
    and: vi.fn((...args: unknown[]) => ({ and: args })),
    sql: vi.fn(),
}));

// ── Mock PolymarketOracle ───────────────────────────────────────
const mockBatchGetResolutionStatus = vi.fn();
vi.mock("@/lib/polymarket-oracle", () => ({
    PolymarketOracle: {
        batchGetResolutionStatus: (...args: unknown[]) => mockBatchGetResolutionStatus(...args),
    },
}));

// ── Mock BalanceManager ─────────────────────────────────────────
const mockAdjustBalance = vi.fn().mockResolvedValue(10500);
vi.mock("@/lib/trading/BalanceManager", () => ({
    BalanceManager: {
        adjustBalance: (...args: unknown[]) => mockAdjustBalance(...args),
    },
}));

// ── Mock Logger ─────────────────────────────────────────────────
vi.mock("@/lib/logger", () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }),
}));

// ── Import AFTER mocks ─────────────────────────────────────────
import { settleResolvedPositions } from "@/lib/settlement";

// ── Helpers ─────────────────────────────────────────────────────
function mkPosition(overrides: Record<string, unknown> = {}) {
    return {
        id: "pos-001",
        marketId: "market-abc",
        challengeId: "challenge-001",
        direction: "YES",
        entryPrice: "0.4000",
        shares: "500",
        status: "OPEN",
        currentPrice: null,
        ...overrides,
    };
}

function mkResolution(overrides: Record<string, unknown> = {}) {
    return {
        marketId: "market-abc",
        isResolved: true,
        isClosed: true,
        resolutionPrice: 1,
        winningOutcome: "Yes",
        source: "api" as const,
        checkedAt: new Date(),
        ...overrides,
    };
}

// ── Setup ───────────────────────────────────────────────────────
beforeEach(() => {
    vi.clearAllMocks();
    // Default: FOR UPDATE returns OPEN position
    mockExecute.mockResolvedValue({ rows: [{ id: "pos-001", status: "OPEN" }] });
    // Default: update/insert chain
    mockUpdate.mockReturnValue({
        set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
        }),
    });
    mockInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
    });
});


// =====================================================================
// SETTLEMENT TESTS
// =====================================================================

describe("settleResolvedPositions", () => {

    it("settles winning YES position with correct PnL and balance credit", async () => {
        // 500 shares @ $0.40 YES, market resolves YES (price=1)
        // Expected: PnL = 500 * (1 - 0.40) = $300, proceeds = 500 * 1 = $500
        const pos = mkPosition();
        mockFindMany.mockResolvedValue([pos]);

        const resolution = mkResolution({ marketId: "market-abc", resolutionPrice: 1 });
        mockBatchGetResolutionStatus.mockResolvedValue(new Map([["market-abc", resolution]]));

        const result = await settleResolvedPositions();

        expect(result.positionsSettled).toBe(1);
        expect(result.totalPnLSettled).toBeCloseTo(300, 1); // 500 * (1 - 0.4)
        expect(result.errors).toHaveLength(0);

        // Verify balance was credited with proceeds (500 * 1 = 500)
        expect(mockAdjustBalance).toHaveBeenCalledWith(
            expect.anything(), // tx
            "challenge-001",
            500, // proceeds = shares * settlementPrice
            "market_settlement"
        );
    });

    it("settles winning NO position with inverted settlement price", async () => {
        // 200 shares @ $0.60 NO, market resolves NO wins (YES resolutionPrice=0)
        // NO settlement price = 1 - 0 = 1
        // PnL = 200 * (1 - 0.60) = $80, proceeds = 200 * 1 = $200
        const pos = mkPosition({
            id: "pos-no",
            direction: "NO",
            entryPrice: "0.6000",
            shares: "200",
        });
        mockExecute.mockResolvedValue({ rows: [{ id: "pos-no", status: "OPEN" }] });
        mockFindMany.mockResolvedValue([pos]);

        const resolution = mkResolution({
            marketId: "market-abc",
            resolutionPrice: 0,
            winningOutcome: "No",
        });
        mockBatchGetResolutionStatus.mockResolvedValue(new Map([["market-abc", resolution]]));

        const result = await settleResolvedPositions();

        expect(result.positionsSettled).toBe(1);
        expect(result.totalPnLSettled).toBeCloseTo(80, 1); // 200 * (1 - 0.60)
        expect(mockAdjustBalance).toHaveBeenCalledWith(
            expect.anything(),
            "challenge-001",
            200, // proceeds = 200 * 1
            "market_settlement"
        );
    });

    it("settles losing NO position — negative PnL, zero proceeds, no credit", async () => {
        // 300 shares @ $0.40 NO, market resolves YES wins (resolutionPrice=1)
        // NO settlement price = 1 - 1 = 0
        // PnL = 300 * (0 - 0.40) = -$120, proceeds = 300 * 0 = $0
        const pos = mkPosition({
            id: "pos-lose",
            direction: "NO",
            entryPrice: "0.4000",
            shares: "300",
        });
        mockExecute.mockResolvedValue({ rows: [{ id: "pos-lose", status: "OPEN" }] });
        mockFindMany.mockResolvedValue([pos]);

        const resolution = mkResolution({
            marketId: "market-abc",
            resolutionPrice: 1,
            winningOutcome: "Yes",
        });
        mockBatchGetResolutionStatus.mockResolvedValue(new Map([["market-abc", resolution]]));

        const result = await settleResolvedPositions();

        expect(result.positionsSettled).toBe(1);
        expect(result.totalPnLSettled).toBeCloseTo(-120, 1);
        // Proceeds = 0, so adjustBalance should NOT be called
        expect(mockAdjustBalance).not.toHaveBeenCalled();
    });

    it("skips already-settled position (double-settlement guard)", async () => {
        const pos = mkPosition();
        mockFindMany.mockResolvedValue([pos]);

        const resolution = mkResolution();
        mockBatchGetResolutionStatus.mockResolvedValue(new Map([["market-abc", resolution]]));

        // FOR UPDATE returns CLOSED — someone already settled it
        mockExecute.mockResolvedValue({ rows: [{ id: "pos-001", status: "CLOSED" }] });

        const result = await settleResolvedPositions();

        // Should NOT have credited balance or recorded a trade
        expect(mockAdjustBalance).not.toHaveBeenCalled();
        expect(mockInsert).not.toHaveBeenCalled();
        // Position was checked but not successfully "settled" (counter didn't increment inside tx)
        expect(result.errors).toHaveLength(0);
    });

    it("skips position with ambiguous resolution (no price, no outcome)", async () => {
        const pos = mkPosition();
        mockFindMany.mockResolvedValue([pos]);

        // Resolved but missing both resolutionPrice AND winningOutcome
        const resolution = mkResolution({
            marketId: "market-abc",
            resolutionPrice: undefined,
            winningOutcome: undefined,
        });
        mockBatchGetResolutionStatus.mockResolvedValue(new Map([["market-abc", resolution]]));

        const result = await settleResolvedPositions();

        expect(result.positionsSettled).toBe(0);
        expect(mockAdjustBalance).not.toHaveBeenCalled();
    });

    it("settles only resolved positions in mixed batch", async () => {
        const pos1 = mkPosition({ id: "pos-1", marketId: "mkt-resolved" });
        const pos2 = mkPosition({ id: "pos-2", marketId: "mkt-unresolved" });
        const pos3 = mkPosition({ id: "pos-3", marketId: "mkt-resolved-2", entryPrice: "0.3000", shares: "100" });
        mockFindMany.mockResolvedValue([pos1, pos2, pos3]);

        // First call returns OPEN for pos-1, second for pos-3
        mockExecute
            .mockResolvedValueOnce({ rows: [{ id: "pos-1", status: "OPEN" }] })
            .mockResolvedValueOnce({ rows: [{ id: "pos-3", status: "OPEN" }] });

        const resolutions = new Map([
            ["mkt-resolved", mkResolution({ marketId: "mkt-resolved", resolutionPrice: 1 })],
            ["mkt-unresolved", { ...mkResolution({ marketId: "mkt-unresolved" }), isResolved: false }],
            ["mkt-resolved-2", mkResolution({ marketId: "mkt-resolved-2", resolutionPrice: 1 })],
        ]);
        mockBatchGetResolutionStatus.mockResolvedValue(resolutions);

        const result = await settleResolvedPositions();

        expect(result.positionsChecked).toBe(3);
        expect(result.positionsSettled).toBe(2);
        // pos1: 500 * (1 - 0.40) = 300, pos3: 100 * (1 - 0.30) = 70
        expect(result.totalPnLSettled).toBeCloseTo(370, 1);
    });

    it("isolates errors — one failure doesn't block other settlements", async () => {
        const pos1 = mkPosition({ id: "pos-fail", marketId: "mkt-1" });
        const pos2 = mkPosition({ id: "pos-ok", marketId: "mkt-2", entryPrice: "0.5000", shares: "100" });
        mockFindMany.mockResolvedValue([pos1, pos2]);

        const resolutions = new Map([
            ["mkt-1", mkResolution({ marketId: "mkt-1", resolutionPrice: 1 })],
            ["mkt-2", mkResolution({ marketId: "mkt-2", resolutionPrice: 1 })],
        ]);
        mockBatchGetResolutionStatus.mockResolvedValue(resolutions);

        // First transaction throws, second succeeds
        const { db } = await import("@/db");
        let callCount = 0;
        vi.mocked(db.transaction).mockImplementation(async (cb) => {
            callCount++;
            if (callCount === 1) {
                throw new Error("DB connection lost");
            }
            const tx = { execute: mockExecute, update: mockUpdate, insert: mockInsert };
            mockExecute.mockResolvedValueOnce({ rows: [{ id: "pos-ok", status: "OPEN" }] });
            await cb(tx as unknown as Parameters<typeof cb>[0]);
        });

        const result = await settleResolvedPositions();

        expect(result.positionsSettled).toBe(1);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toContain("pos-fail");
    });

    it("returns clean result when no open positions exist", async () => {
        mockFindMany.mockResolvedValue([]);

        const result = await settleResolvedPositions();

        expect(result.positionsChecked).toBe(0);
        expect(result.positionsSettled).toBe(0);
        expect(result.totalPnLSettled).toBe(0);
        expect(result.errors).toHaveLength(0);
        expect(mockBatchGetResolutionStatus).not.toHaveBeenCalled();
    });

    it("uses winningOutcome string when resolutionPrice is missing", async () => {
        // Oracle returns winningOutcome: "Yes" but no resolutionPrice
        const pos = mkPosition({ entryPrice: "0.3000", shares: "100" });
        mockFindMany.mockResolvedValue([pos]);

        const resolution = mkResolution({
            marketId: "market-abc",
            resolutionPrice: undefined,
            winningOutcome: "Yes",
        });
        mockBatchGetResolutionStatus.mockResolvedValue(new Map([["market-abc", resolution]]));

        const result = await settleResolvedPositions();

        expect(result.positionsSettled).toBe(1);
        // YES won, YES position: settlementPrice = 1
        // PnL = 100 * (1 - 0.30) = $70
        expect(result.totalPnLSettled).toBeCloseTo(70, 1);
    });
});
