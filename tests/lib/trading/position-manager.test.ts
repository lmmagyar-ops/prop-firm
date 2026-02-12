/**
 * PositionManager Tests
 *
 * Tests the financial core: opening, averaging, and closing positions.
 * Every dollar flows through these functions. Getting the math wrong
 * here means corrupted P&L, wrong balances, and incorrect payouts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PositionManager } from "@/lib/trading/PositionManager";

// ── Mock Drizzle transaction ────────────────────────────────────
// PositionManager takes `tx` as first arg — we mock the DB ops it uses.

function createMockTx(overrides: {
    insertReturning?: any[];
    findFirst?: any;
    updateResult?: any;
} = {}) {
    const tx = {
        insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue(
                    overrides.insertReturning ?? [{
                        id: "pos-001",
                        challengeId: "ch-1",
                        marketId: "mkt-1",
                        direction: "YES",
                        shares: "100",
                        sizeAmount: "50",
                        entryPrice: "0.50",
                        currentPrice: "0.50",
                        status: "OPEN",
                    }]
                ),
            }),
        }),
        query: {
            positions: {
                findFirst: vi.fn().mockResolvedValue(overrides.findFirst ?? null),
            },
        },
        update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(overrides.updateResult ?? undefined),
            }),
        }),
    };
    return tx;
}

// =====================================================================
// openPosition
// =====================================================================
describe("PositionManager.openPosition", () => {
    it("creates a position with correct fields", async () => {
        const tx = createMockTx();

        const result = await PositionManager.openPosition(
            tx, "ch-1", "mkt-1", 200, 0.55, 110, "YES"
        );

        expect(result).toBeDefined();
        expect(result.status).toBe("OPEN");

        // Verify insert was called with correct values
        const insertCall = tx.insert.mock.results[0].value.values;
        const insertedValues = insertCall.mock.calls[0][0];
        expect(insertedValues.challengeId).toBe("ch-1");
        expect(insertedValues.marketId).toBe("mkt-1");
        expect(insertedValues.direction).toBe("YES");
        expect(insertedValues.shares).toBe("200");
        expect(insertedValues.sizeAmount).toBe("110");
        expect(insertedValues.entryPrice).toBe("0.55");
        expect(insertedValues.currentPrice).toBe("0.55");
        expect(insertedValues.status).toBe("OPEN");
    });

    it("creates NO direction position", async () => {
        const tx = createMockTx({
            insertReturning: [{
                id: "pos-no-1", direction: "NO", shares: "100",
                entryPrice: "0.40", status: "OPEN",
            }],
        });

        const result = await PositionManager.openPosition(
            tx, "ch-1", "mkt-1", 100, 0.40, 40, "NO"
        );

        expect(result.direction).toBe("NO");

        const insertedValues = tx.insert.mock.results[0].value.values.mock.calls[0][0];
        expect(insertedValues.direction).toBe("NO");
    });

    it("clamps entry price ≤ 0.01 to 0.01", async () => {
        const tx = createMockTx();

        await PositionManager.openPosition(
            tx, "ch-1", "mkt-1", 100, 0.005, 0.50, "YES"
        );

        const insertedValues = tx.insert.mock.results[0].value.values.mock.calls[0][0];
        expect(insertedValues.entryPrice).toBe("0.01");
    });

    it("clamps entry price ≥ 0.99 to 0.99", async () => {
        const tx = createMockTx();

        await PositionManager.openPosition(
            tx, "ch-1", "mkt-1", 100, 0.995, 99.50, "YES"
        );

        const insertedValues = tx.insert.mock.results[0].value.values.mock.calls[0][0];
        expect(insertedValues.entryPrice).toBe("0.99");
    });
});

// =====================================================================
// addToPosition — VWAP Averaging
// =====================================================================
describe("PositionManager.addToPosition", () => {
    it("calculates VWAP correctly when adding shares", async () => {
        const existingPosition = {
            id: "pos-001",
            shares: "100",
            entryPrice: "0.40",
            sizeAmount: "40",
            currentPrice: "0.40",
        };

        const tx = createMockTx({ findFirst: existingPosition });

        await PositionManager.addToPosition(tx, "pos-001", 50, 0.60, 30);

        // VWAP: (100 * 0.40 + 50 * 0.60) / 150 = (40 + 30) / 150 = 0.4667
        const setCall = tx.update.mock.results[0].value.set.mock.calls[0][0];
        expect(parseFloat(setCall.shares)).toBeCloseTo(150, 4);
        expect(parseFloat(setCall.entryPrice)).toBeCloseTo(0.4667, 3);
    });

    it("accumulates sizeAmount", async () => {
        const existingPosition = {
            id: "pos-001",
            shares: "200",
            entryPrice: "0.50",
            sizeAmount: "100",
            currentPrice: "0.50",
        };

        const tx = createMockTx({ findFirst: existingPosition });

        await PositionManager.addToPosition(tx, "pos-001", 100, 0.55, 55);

        const setCall = tx.update.mock.results[0].value.set.mock.calls[0][0];
        // sizeAmount should be 100 + 55 = 155
        expect(parseFloat(setCall.sizeAmount)).toBeCloseTo(155, 2);
    });

    it("does NOT update currentPrice during add-to-position (price refresh is separate)", async () => {
        const existingPosition = {
            id: "pos-001",
            shares: "100",
            entryPrice: "0.40",
            sizeAmount: "40",
            currentPrice: "0.40",
        };

        const tx = createMockTx({ findFirst: existingPosition });

        await PositionManager.addToPosition(tx, "pos-001", 50, 0.65, 32.50);

        const setCall = tx.update.mock.results[0].value.set.mock.calls[0][0];
        // currentPrice is NOT set during add-to-position
        expect(setCall.currentPrice).toBeUndefined();
    });

    it("throws when position not found", async () => {
        const tx = createMockTx({ findFirst: null });

        await expect(
            PositionManager.addToPosition(tx, "nonexistent", 50, 0.60, 30)
        ).rejects.toThrow("Position not found");
    });
});

// =====================================================================
// reducePosition
// =====================================================================
describe("PositionManager.reducePosition", () => {
    it("partial sell: returns correct proceeds and remaining shares", async () => {
        const existingPosition = {
            id: "pos-001",
            shares: "200",
            entryPrice: "0.40",
            currentPrice: "0.55",
        };

        const tx = createMockTx({ findFirst: existingPosition });

        const result = await PositionManager.reducePosition(tx, "pos-001", 80, 0.60);

        // proceeds = 80 * 0.60 = $48
        expect(result.proceeds).toBeCloseTo(48, 2);
        // remaining = 200 - 80 = 120
        expect(result.remainingShares).toBe(120);

        // Should update shares but NOT close
        const setCall = tx.update.mock.results[0].value.set.mock.calls[0][0];
        expect(setCall.shares).toBe("120");
        expect(setCall.status).toBeUndefined(); // Not closed
    });

    it("full close: sets status to CLOSED with correct pnl", async () => {
        const existingPosition = {
            id: "pos-001",
            shares: "100",
            entryPrice: "0.40",
            currentPrice: "0.55",
        };

        const tx = createMockTx({ findFirst: existingPosition });

        const result = await PositionManager.reducePosition(tx, "pos-001", 100, 0.65);

        // proceeds = 100 * 0.65 = $65
        expect(result.proceeds).toBeCloseTo(65, 2);
        expect(result.remainingShares).toBe(0);

        // Should set CLOSED status, pnl, closedPrice
        const setCall = tx.update.mock.results[0].value.set.mock.calls[0][0];
        expect(setCall.status).toBe("CLOSED");
        expect(setCall.shares).toBe("0");
        expect(setCall.closedPrice).toBe("0.65");
        // pnl = 100 * (0.65 - 0.40) = $25
        expect(parseFloat(setCall.pnl)).toBeCloseTo(25, 2);
        expect(setCall.closedAt).toBeInstanceOf(Date);
    });

    it("dust threshold: near-zero shares trigger full close", async () => {
        const existingPosition = {
            id: "pos-001",
            shares: "100.00005", // Selling 100 leaves 0.00005 (< 0.0001 threshold)
            entryPrice: "0.50",
            currentPrice: "0.55",
        };

        const tx = createMockTx({ findFirst: existingPosition });

        const result = await PositionManager.reducePosition(tx, "pos-001", 100, 0.60);

        // Should trigger full close due to dust threshold
        const setCall = tx.update.mock.results[0].value.set.mock.calls[0][0];
        expect(setCall.status).toBe("CLOSED");
        expect(setCall.shares).toBe("0");
    });

    it("throws when selling more shares than owned", async () => {
        const existingPosition = {
            id: "pos-001",
            shares: "50",
            entryPrice: "0.50",
            currentPrice: "0.55",
        };

        const tx = createMockTx({ findFirst: existingPosition });

        await expect(
            PositionManager.reducePosition(tx, "pos-001", 100, 0.60)
        ).rejects.toThrow("Insufficient shares");
    });

    it("throws when position not found", async () => {
        const tx = createMockTx({ findFirst: null });

        await expect(
            PositionManager.reducePosition(tx, "nonexistent", 50, 0.60)
        ).rejects.toThrow("Position not found");
    });

    it("falls back to currentPrice when exitPrice not provided", async () => {
        const existingPosition = {
            id: "pos-001",
            shares: "100",
            entryPrice: "0.40",
            currentPrice: "0.70",
        };

        const tx = createMockTx({ findFirst: existingPosition });

        const result = await PositionManager.reducePosition(tx, "pos-001", 50);

        // proceeds = 50 * 0.70 (fallback to currentPrice)
        expect(result.proceeds).toBeCloseTo(35, 2);
    });

    it("pnl calculation: profitable close", async () => {
        const existingPosition = {
            id: "pos-001",
            shares: "200",
            entryPrice: "0.30",
            currentPrice: "0.55",
        };

        const tx = createMockTx({ findFirst: existingPosition });

        await PositionManager.reducePosition(tx, "pos-001", 200, 0.55);

        const setCall = tx.update.mock.results[0].value.set.mock.calls[0][0];
        // pnl = 200 * (0.55 - 0.30) = $50
        expect(parseFloat(setCall.pnl)).toBeCloseTo(50, 2);
    });

    it("pnl calculation: losing close", async () => {
        const existingPosition = {
            id: "pos-001",
            shares: "150",
            entryPrice: "0.60",
            currentPrice: "0.35",
        };

        const tx = createMockTx({ findFirst: existingPosition });

        await PositionManager.reducePosition(tx, "pos-001", 150, 0.35);

        const setCall = tx.update.mock.results[0].value.set.mock.calls[0][0];
        // pnl = 150 * (0.35 - 0.60) = -$37.50
        expect(parseFloat(setCall.pnl)).toBeCloseTo(-37.50, 2);
    });
});
