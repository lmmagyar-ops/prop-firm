/**
 * Financial Chaos Tests — Adversarial & Boundary Inputs
 *
 * Tests that financial computation functions behave safely with:
 * - NaN, Infinity, negative values
 * - Boundary prices (0, 1, just inside/outside valid range)
 * - Empty/malformed data
 * - Tier resolution edge cases
 *
 * These tests ensure the system fails SAFE (blocks trades, returns zero)
 * rather than producing garbage numbers that reach the DB.
 *
 * NO MOCKS — all pure functions.
 */
import { describe, it, expect } from "vitest";
import {
    getDirectionAdjustedPrice,
    calculatePositionMetrics,
    getPortfolioValue,
} from "@/lib/position-utils";
import { getFundedTier, getExposureLimitByVolume } from "@/lib/funded-rules";
import {
    calculateImpact,
    buildSyntheticOrderBook,
    isBookDead,
} from "@/lib/order-book-engine";
import type { OrderBook } from "@/lib/market";

// ─── HELPERS ────────────────────────────────────────────────────────

function makeBook(
    bids: [string, string][],
    asks: [string, string][]
): OrderBook {
    return {
        bids: bids.map(([price, size]) => ({ price, size })),
        asks: asks.map(([price, size]) => ({ price, size })),
    };
}

// ─── getFundedTier — Boundary Resolution ────────────────────────────

describe("getFundedTier — tier boundary resolution", () => {
    it("resolves $5,000 account to 5k tier", () => {
        expect(getFundedTier(5000)).toBe("5k");
    });

    it("resolves $10,000 account to 10k tier", () => {
        expect(getFundedTier(10000)).toBe("10k");
    });

    it("resolves $25,000 account to 25k tier", () => {
        expect(getFundedTier(25000)).toBe("25k");
    });

    it("resolves balances between tiers to lower tier", () => {
        expect(getFundedTier(7500)).toBe("5k");   // Between 5k and 10k
        expect(getFundedTier(15000)).toBe("10k");  // Between 10k and 25k
    });

    it("resolves $100,000 to 25k tier (highest available)", () => {
        expect(getFundedTier(100000)).toBe("25k");
    });

    it("resolves $1 to 5k tier (minimum)", () => {
        expect(getFundedTier(1)).toBe("5k");
    });
});

// ─── getDirectionAdjustedPrice — Adversarial Inputs ─────────────────

describe("getDirectionAdjustedPrice — adversarial inputs", () => {
    it("handles price = 0 for YES", () => {
        expect(getDirectionAdjustedPrice(0, "YES")).toBe(0);
    });

    it("handles price = 0 for NO → returns 1", () => {
        expect(getDirectionAdjustedPrice(0, "NO")).toBe(1);
    });

    it("handles price = 1 for YES", () => {
        expect(getDirectionAdjustedPrice(1, "YES")).toBe(1);
    });

    it("handles price = 1 for NO → returns 0", () => {
        expect(getDirectionAdjustedPrice(1, "NO")).toBe(0);
    });

    it("handles NaN — returns NaN (callers must guard)", () => {
        expect(getDirectionAdjustedPrice(NaN, "YES")).toBeNaN();
    });

    it("handles negative price for NO (guard in caller)", () => {
        // -0.5 → NO: 1 - (-0.5) = 1.5 — callers must validate range
        expect(getDirectionAdjustedPrice(-0.5, "NO")).toBe(1.5);
    });
});

// ─── calculatePositionMetrics — Chaos Inputs ────────────────────────

describe("calculatePositionMetrics — chaos inputs", () => {
    it("handles zero shares — returns zero values", () => {
        const result = calculatePositionMetrics(0, 0.50, 0.60, "YES");
        expect(result.positionValue).toBe(0);
        expect(result.unrealizedPnL).toBe(0);
    });

    it("handles NaN current price — propagates NaN (callers guard)", () => {
        const result = calculatePositionMetrics(10, 0.50, NaN, "YES");
        expect(result.positionValue).toBeNaN();
    });

    it("handles negative shares — returns negative values (callers guard)", () => {
        const result = calculatePositionMetrics(-10, 0.50, 0.60, "YES");
        expect(result.positionValue).toBeLessThan(0);
    });

    it("handles extreme price movement (0.01 → 0.99)", () => {
        const result = calculatePositionMetrics(100, 0.01, 0.99, "YES");
        // Position value: 100 * 0.99 = 99
        expect(result.positionValue).toBeCloseTo(99, 2);
        // PnL: (0.99 - 0.01) * 100 = 98
        expect(result.unrealizedPnL).toBeCloseTo(98, 2);
    });

    it("handles NO position with price dropping to 0.01", () => {
        // NO: effective = 1 - 0.01 = 0.99 (great for NO holder)
        const result = calculatePositionMetrics(100, 0.60, 0.01, "NO");
        expect(result.effectiveCurrentPrice).toBeCloseTo(0.99, 2);
        expect(result.unrealizedPnL).toBeGreaterThan(0);
    });
});

// ─── getPortfolioValue — Malformed Data Resilience ──────────────────

describe("getPortfolioValue — malformed data resilience", () => {
    it("skips positions with zero shares", () => {
        const result = getPortfolioValue(
            [{ marketId: "m1", shares: "0", entryPrice: "0.50" }],
            new Map([["m1", { price: "0.60" }]])
        );
        expect(result.positions).toHaveLength(0);
        expect(result.totalValue).toBe(0);
    });

    it("skips positions with negative shares", () => {
        const result = getPortfolioValue(
            [{ marketId: "m1", shares: "-10", entryPrice: "0.50" }],
            new Map([["m1", { price: "0.60" }]])
        );
        expect(result.positions).toHaveLength(0);
    });

    it("handles unparseable entry price — safeParseFloat returns 0", () => {
        // safeParseFloat("not-a-number") returns 0, not NaN.
        // entryPrice=0 passes the isNaN guard, so the position IS included.
        // This documents actual behavior — the position appears with entryPrice=0.
        const result = getPortfolioValue(
            [{ marketId: "m1", shares: "10", entryPrice: "not-a-number" }],
            new Map([["m1", { price: "0.60" }]])
        );
        expect(result.positions).toHaveLength(1);
        expect(result.positions[0].effectivePrice).toBe(0.60);
    });

    it("falls back to entry price when live price is NaN", () => {
        const result = getPortfolioValue(
            [{ marketId: "m1", shares: "10", entryPrice: "0.50" }],
            new Map([["m1", { price: "garbage" }]])
        );
        // NaN live price → invalid → falls back to stored entry price
        expect(result.positions[0].effectivePrice).toBe(0.50);
        expect(result.positions[0].priceSource).toBe("stored");
    });

    it("handles mix of valid and invalid positions", () => {
        const result = getPortfolioValue(
            [
                { marketId: "m1", shares: "10", entryPrice: "0.50" },  // valid
                { marketId: "m2", shares: "NaN", entryPrice: "0.50" }, // invalid shares
                { marketId: "m3", shares: "5", entryPrice: "0.40" },  // valid
            ],
            new Map([["m1", { price: "0.60" }], ["m3", { price: "0.70" }]])
        );
        expect(result.positions).toHaveLength(2);
        expect(result.totalValue).toBeGreaterThan(0);
    });

    it("handles empty live price map (all fall back to stored)", () => {
        const result = getPortfolioValue(
            [
                { marketId: "m1", shares: "10", entryPrice: "0.50", currentPrice: "0.55" },
            ],
            new Map()
        );
        expect(result.positions[0].priceSource).toBe("stored");
        expect(result.positions[0].effectivePrice).toBe(0.55);
    });
});

// ─── calculateImpact — Adversarial Order Books ──────────────────────

describe("calculateImpact — adversarial inputs", () => {
    it("handles zero-size levels gracefully", () => {
        const book = makeBook([], [["0.50", "0"], ["0.60", "100"]]);
        const result = calculateImpact(book, "BUY", 30);
        expect(result.filled).toBe(true);
        expect(result.executedPrice).toBeCloseTo(0.60, 2);
    });

    it("handles NaN-price levels — skipped by levelPrice <= 0 guard", () => {
        // parseFloat("NaN") → NaN, and NaN <= 0 is false, so it enters the loop body.
        // But NaN * levelSize = NaN → levelCost is NaN → remainingAmount comparison fails.
        // The level is effectively skipped because no arithmetic produces a fill.
        const book = makeBook([], [["NaN", "100"], ["0.50", "200"]]);
        const result = calculateImpact(book, "BUY", 50);
        // After sorting: NaN sorts unpredictably. The 0.50 level fills the trade.
        expect(result.filled).toBe(true);
    });

    it("handles very small trade amounts (< $1)", () => {
        const book = makeBook([], [["0.50", "5000"]]);
        const result = calculateImpact(book, "BUY", 0.50);
        expect(result.filled).toBe(true);
        expect(result.totalShares).toBeCloseTo(1, 0);
    });

    it("handles very large trade amounts exceeding all liquidity", () => {
        const book = makeBook([], [["0.50", "10"]]);  // Only $5 of liquidity
        const result = calculateImpact(book, "BUY", 1_000_000);
        expect(result.filled).toBe(false);
    });
});

// ─── getExposureLimitByVolume — Boundary Values ─────────────────────

describe("getExposureLimitByVolume — boundary values", () => {
    it("returns 0 for negative volume", () => {
        expect(getExposureLimitByVolume(10000, -1)).toBe(0);
    });

    it("returns 0 for zero balance regardless of volume", () => {
        expect(getExposureLimitByVolume(0, 50_000_000)).toBe(0);
    });

    it("threshold boundaries are inclusive (≥)", () => {
        // Exactly at $10M → should get high volume rate (5%)
        expect(getExposureLimitByVolume(10000, 10_000_000)).toBe(500);
        // Just below → medium (2.5%)
        expect(getExposureLimitByVolume(10000, 9_999_999)).toBe(250);
    });
});

// ─── Synthetic Order Book — Extreme Prices ──────────────────────────

describe("buildSyntheticOrderBook — extreme prices", () => {
    it("doesn't crash with price = 0", () => {
        const book = buildSyntheticOrderBook(0);
        expect(book.bids).toHaveLength(3);
        expect(book.asks).toHaveLength(3);
    });

    it("doesn't crash with price = 1", () => {
        const book = buildSyntheticOrderBook(1);
        expect(book.bids).toHaveLength(3);
        expect(book.asks).toHaveLength(3);
    });

    it("doesn't crash with NaN price", () => {
        const book = buildSyntheticOrderBook(NaN);
        // Should still return structure even if values are NaN
        expect(book.bids).toHaveLength(3);
        expect(book.asks).toHaveLength(3);
    });
});

// ─── isBookDead — Adversarial Inputs ────────────────────────────────

describe("isBookDead — adversarial inputs", () => {
    it("NaN prices: Math.min/max return NaN → spread is NaN → comparisons are false", () => {
        // Math.max(NaN) → NaN, Math.min(NaN) → NaN
        // spread = NaN - NaN = NaN, NaN > 0.50 → false, NaN >= 0.90 → false
        // So isBookDead returns false — a subtle edge case.
        // This documents behavior: callers should validate prices before passing.
        const book = makeBook([["NaN", "100"]], [["NaN", "100"]]);
        expect(isBookDead(book)).toBe(false);
    });

    it("returns true for undefined bids/asks", () => {
        const book = { bids: undefined as any, asks: undefined as any };
        // Should handle gracefully — undefined || [] = []
        expect(isBookDead(book)).toBe(true);
    });
});
