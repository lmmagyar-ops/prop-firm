import { describe, it, expect } from "vitest";
import {
    getPortfolioValue,
    getDirectionAdjustedPrice,
    calculatePositionMetrics,
    type PositionForValuation,
} from "@/lib/position-utils";

// ─── getDirectionAdjustedPrice ──────────────────────────────────────

describe("getDirectionAdjustedPrice", () => {
    it("returns raw price for YES direction", () => {
        expect(getDirectionAdjustedPrice(0.65, "YES")).toBe(0.65);
    });

    it("returns inverted price for NO direction", () => {
        expect(getDirectionAdjustedPrice(0.65, "NO")).toBe(0.35);
    });

    it("handles boundary price 0", () => {
        expect(getDirectionAdjustedPrice(0, "YES")).toBe(0);
        expect(getDirectionAdjustedPrice(0, "NO")).toBe(1);
    });

    it("handles boundary price 1", () => {
        expect(getDirectionAdjustedPrice(1, "YES")).toBe(1);
        expect(getDirectionAdjustedPrice(1, "NO")).toBe(0);
    });

    it("handles midpoint price 0.50", () => {
        expect(getDirectionAdjustedPrice(0.5, "YES")).toBe(0.5);
        expect(getDirectionAdjustedPrice(0.5, "NO")).toBe(0.5);
    });
});

// ─── calculatePositionMetrics ───────────────────────────────────────

describe("calculatePositionMetrics", () => {
    it("calculates YES position with profit", () => {
        // Bought 10 shares at 0.40 entry, current YES price is 0.60
        const result = calculatePositionMetrics(10, 0.40, 0.60, "YES");
        expect(result.effectiveCurrentPrice).toBe(0.60);
        expect(result.positionValue).toBeCloseTo(6.0);
        expect(result.unrealizedPnL).toBeCloseTo(2.0); // (0.60 - 0.40) * 10
    });

    it("calculates YES position with loss", () => {
        // Bought 10 shares at 0.60, current price dropped to 0.40
        const result = calculatePositionMetrics(10, 0.60, 0.40, "YES");
        expect(result.effectiveCurrentPrice).toBe(0.40);
        expect(result.unrealizedPnL).toBeCloseTo(-2.0);
    });

    it("calculates NO position correctly (inverts current price)", () => {
        // NO position: bought 10 shares at 0.60 (entry already direction-adjusted)
        // Current YES price is 0.30, so NO price = 0.70
        const result = calculatePositionMetrics(10, 0.60, 0.30, "NO");
        expect(result.effectiveCurrentPrice).toBe(0.70);
        expect(result.positionValue).toBeCloseTo(7.0);
        expect(result.unrealizedPnL).toBeCloseTo(1.0); // (0.70 - 0.60) * 10
    });

    it("handles break-even position", () => {
        const result = calculatePositionMetrics(10, 0.50, 0.50, "YES");
        expect(result.unrealizedPnL).toBeCloseTo(0);
    });
});

// ─── getPortfolioValue ──────────────────────────────────────────────

describe("getPortfolioValue", () => {
    // Helper: create a position
    function mkPos(overrides: Partial<PositionForValuation> & { marketId: string }): PositionForValuation {
        return {
            shares: "10",
            entryPrice: "0.50",
            direction: "YES",
            currentPrice: null,
            ...overrides,
        };
    }

    // Helper: create live price map
    function mkPrices(entries: Record<string, string>): Map<string, { price: string; source?: string }> {
        const map = new Map<string, { price: string; source?: string }>();
        for (const [id, price] of Object.entries(entries)) {
            map.set(id, { price, source: "gamma" });
        }
        return map;
    }

    // ── Empty / degenerate inputs ─────────────────────────────────

    it("returns zero for empty positions array", () => {
        const result = getPortfolioValue([], new Map());
        expect(result.totalValue).toBe(0);
        expect(result.positions).toHaveLength(0);
    });

    it("skips positions with zero shares", () => {
        const result = getPortfolioValue(
            [mkPos({ marketId: "m1", shares: "0" })],
            mkPrices({ m1: "0.50" })
        );
        expect(result.positions).toHaveLength(0);
        expect(result.totalValue).toBe(0);
    });

    it("skips positions with negative shares", () => {
        const result = getPortfolioValue(
            [mkPos({ marketId: "m1", shares: "-5" })],
            mkPrices({ m1: "0.50" })
        );
        expect(result.positions).toHaveLength(0);
    });

    it("skips positions with NaN shares", () => {
        const result = getPortfolioValue(
            [mkPos({ marketId: "m1", shares: "not-a-number" })],
            mkPrices({ m1: "0.50" })
        );
        expect(result.positions).toHaveLength(0);
    });

    it("handles positions with unparseable entry price (safeParseFloat returns 0)", () => {
        // safeParseFloat("invalid") = 0, and entryPrice=0 is not NaN,
        // but shares > 0 so the position IS included with effectivePrice=0
        const result = getPortfolioValue(
            [mkPos({ marketId: "m1", entryPrice: "invalid" })],
            mkPrices({ m1: "0.50" })
        );
        // safeParseFloat returns 0 for invalid, so entryPrice = 0 (not NaN)
        // Position IS included since isNaN(0) = false
        expect(result.positions).toHaveLength(1);
        expect(result.positions[0].effectivePrice).toBe(0.50);
    });

    // ── Live price path ───────────────────────────────────────────

    it("uses live price for YES position when in valid range", () => {
        const result = getPortfolioValue(
            [mkPos({ marketId: "m1", shares: "10", entryPrice: "0.40", direction: "YES" })],
            mkPrices({ m1: "0.60" })
        );
        expect(result.positions).toHaveLength(1);
        expect(result.positions[0].effectivePrice).toBe(0.60);
        expect(result.positions[0].priceSource).toBe("live");
        expect(result.positions[0].positionValue).toBeCloseTo(6.0);
        expect(result.positions[0].unrealizedPnL).toBeCloseTo(2.0);
    });

    it("applies direction adjustment for NO position with live price", () => {
        // NO position: live YES price = 0.30, so effective = 1 - 0.30 = 0.70
        const result = getPortfolioValue(
            [mkPos({ marketId: "m1", shares: "10", entryPrice: "0.60", direction: "NO" })],
            mkPrices({ m1: "0.30" })
        );
        expect(result.positions[0].effectivePrice).toBe(0.70);
        expect(result.positions[0].priceSource).toBe("live");
        expect(result.positions[0].unrealizedPnL).toBeCloseTo(1.0);
    });

    // ── Live price rejection (sanity bounds) ──────────────────────

    it("rejects live price at boundary 0.01 → falls back to entry price", () => {
        const result = getPortfolioValue(
            [mkPos({ marketId: "m1", shares: "10", entryPrice: "0.50" })],
            mkPrices({ m1: "0.01" })
        );
        expect(result.positions[0].effectivePrice).toBe(0.50);
        expect(result.positions[0].priceSource).toBe("stored");
    });

    it("rejects live price at boundary 0.99 → falls back to entry price", () => {
        const result = getPortfolioValue(
            [mkPos({ marketId: "m1", shares: "10", entryPrice: "0.50" })],
            mkPrices({ m1: "0.99" })
        );
        expect(result.positions[0].effectivePrice).toBe(0.50);
        expect(result.positions[0].priceSource).toBe("stored");
    });

    it("rejects NaN live price → falls back to entry price", () => {
        const result = getPortfolioValue(
            [mkPos({ marketId: "m1", shares: "10", entryPrice: "0.50" })],
            mkPrices({ m1: "not-a-price" })
        );
        expect(result.positions[0].effectivePrice).toBe(0.50);
        expect(result.positions[0].priceSource).toBe("stored");
    });

    // ── No live price path ────────────────────────────────────────

    it("falls back to stored currentPrice when no live price available", () => {
        const result = getPortfolioValue(
            [mkPos({ marketId: "m1", shares: "10", entryPrice: "0.40", currentPrice: "0.55" })],
            new Map() // no live prices at all
        );
        expect(result.positions[0].effectivePrice).toBe(0.55);
        expect(result.positions[0].priceSource).toBe("stored");
    });

    it("falls back to entry price when currentPrice is null and no live price", () => {
        const result = getPortfolioValue(
            [mkPos({ marketId: "m1", shares: "10", entryPrice: "0.40", currentPrice: null })],
            new Map()
        );
        expect(result.positions[0].effectivePrice).toBe(0.40);
        expect(result.positions[0].priceSource).toBe("stored");
    });

    it("uses 0 when currentPrice is NaN string (safeParseFloat returns 0)", () => {
        // safeParseFloat("bad") = 0, and isNaN(0) = false, so it uses 0
        const result = getPortfolioValue(
            [mkPos({ marketId: "m1", shares: "10", entryPrice: "0.40", currentPrice: "bad" })],
            new Map()
        );
        expect(result.positions[0].effectivePrice).toBe(0);
        expect(result.positions[0].priceSource).toBe("stored");
    });

    // ── Default direction ─────────────────────────────────────────

    it("defaults to YES direction when direction is null", () => {
        const result = getPortfolioValue(
            [mkPos({ marketId: "m1", shares: "10", entryPrice: "0.50", direction: null })],
            mkPrices({ m1: "0.60" })
        );
        // YES direction → effectivePrice = 0.60 (no inversion)
        expect(result.positions[0].effectivePrice).toBe(0.60);
    });

    // ── Multi-position aggregation ────────────────────────────────

    it("correctly aggregates total value across multiple positions", () => {
        const result = getPortfolioValue(
            [
                mkPos({ marketId: "m1", shares: "10", entryPrice: "0.40", direction: "YES" }),
                mkPos({ marketId: "m2", shares: "20", entryPrice: "0.30", direction: "YES" }),
                mkPos({ marketId: "m3", shares: "5", entryPrice: "0.60", direction: "NO" }),
            ],
            mkPrices({ m1: "0.50", m2: "0.40", m3: "0.30" })
        );

        expect(result.positions).toHaveLength(3);

        // m1: 10 * 0.50 = 5.0
        expect(result.positions[0].positionValue).toBeCloseTo(5.0);
        // m2: 20 * 0.40 = 8.0
        expect(result.positions[1].positionValue).toBeCloseTo(8.0);
        // m3: NO direction, live YES = 0.30, effective = 0.70 → 5 * 0.70 = 3.50
        expect(result.positions[2].positionValue).toBeCloseTo(3.5);

        // Total: 5.0 + 8.0 + 3.5 = 16.5
        expect(result.totalValue).toBeCloseTo(16.5);
    });

    it("skips invalid positions but counts valid ones", () => {
        const result = getPortfolioValue(
            [
                mkPos({ marketId: "m1", shares: "10", entryPrice: "0.50" }),  // valid
                mkPos({ marketId: "m2", shares: "0", entryPrice: "0.50" }),   // invalid: zero shares
                mkPos({ marketId: "m3", shares: "bad", entryPrice: "0.50" }), // invalid: NaN shares
            ],
            mkPrices({ m1: "0.60", m2: "0.60", m3: "0.60" })
        );

        expect(result.positions).toHaveLength(1);
        expect(result.positions[0].marketId).toBe("m1");
    });
});
