/**
 * Order Book Engine — Pure Function Tests
 *
 * Tests the 4 core functions in order-book-engine.ts:
 * - invertOrderBook: NO→YES order book inversion
 * - isBookDead: dead book detection
 * - buildSyntheticOrderBook: synthetic book generation
 * - calculateImpact: trade impact simulation (VWAP walk)
 *
 * NO MOCKS — these are all pure functions with zero side effects.
 */
import { describe, it, expect } from "vitest";
import {
    invertOrderBook,
    isBookDead,
    buildSyntheticOrderBook,
    calculateImpact,
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

// ─── invertOrderBook ────────────────────────────────────────────────

describe("invertOrderBook", () => {
    it("inverts NO bids to YES asks (sorted ascending)", () => {
        const noBook = makeBook(
            [["0.40", "100"], ["0.30", "200"]],
            [["0.50", "150"]]
        );
        const yesBook = invertOrderBook(noBook);

        // NO bid at 0.40 → YES ask at 0.60, NO bid at 0.30 → YES ask at 0.70
        expect(yesBook.asks).toHaveLength(2);
        expect(parseFloat(yesBook.asks[0].price)).toBeCloseTo(0.60, 2);
        expect(parseFloat(yesBook.asks[1].price)).toBeCloseTo(0.70, 2);
        // Sizes preserved
        expect(yesBook.asks[0].size).toBe("100");
        expect(yesBook.asks[1].size).toBe("200");
    });

    it("inverts NO asks to YES bids (sorted descending)", () => {
        const noBook = makeBook(
            [["0.40", "100"]],
            [["0.50", "150"], ["0.60", "250"]]
        );
        const yesBook = invertOrderBook(noBook);

        // NO ask at 0.50 → YES bid at 0.50, NO ask at 0.60 → YES bid at 0.40
        expect(yesBook.bids).toHaveLength(2);
        expect(parseFloat(yesBook.bids[0].price)).toBeCloseTo(0.50, 2);
        expect(parseFloat(yesBook.bids[1].price)).toBeCloseTo(0.40, 2);
    });

    it("handles empty bids gracefully", () => {
        const noBook = makeBook([], [["0.50", "100"]]);
        const yesBook = invertOrderBook(noBook);

        expect(yesBook.asks).toHaveLength(0);
        expect(yesBook.bids).toHaveLength(1);
    });

    it("handles empty asks gracefully", () => {
        const noBook = makeBook([["0.40", "100"]], []);
        const yesBook = invertOrderBook(noBook);

        expect(yesBook.bids).toHaveLength(0);
        expect(yesBook.asks).toHaveLength(1);
    });

    it("handles completely empty book", () => {
        const noBook = makeBook([], []);
        const yesBook = invertOrderBook(noBook);

        expect(yesBook.bids).toHaveLength(0);
        expect(yesBook.asks).toHaveLength(0);
    });
});

// ─── isBookDead ─────────────────────────────────────────────────────

describe("isBookDead", () => {
    it("returns false for a healthy book (tight spread)", () => {
        const book = makeBook(
            [["0.48", "1000"]],
            [["0.52", "1000"]]
        );
        expect(isBookDead(book)).toBe(false);
    });

    it("returns true for empty bids", () => {
        const book = makeBook([], [["0.50", "1000"]]);
        expect(isBookDead(book)).toBe(true);
    });

    it("returns true for empty asks", () => {
        const book = makeBook([["0.50", "1000"]], []);
        expect(isBookDead(book)).toBe(true);
    });

    it("returns true when spread > 50¢", () => {
        const book = makeBook(
            [["0.10", "1000"]],
            [["0.70", "1000"]]  // spread = 0.60
        );
        expect(isBookDead(book)).toBe(true);
    });

    it("returns false when spread is exactly 50¢", () => {
        const book = makeBook(
            [["0.20", "1000"]],
            [["0.70", "1000"]]  // spread = 0.50
        );
        expect(isBookDead(book)).toBe(false);
    });

    it("returns true when best ask ≥ 0.90 (resolution territory)", () => {
        const book = makeBook(
            [["0.85", "1000"]],
            [["0.90", "1000"]]  // spread is only 5¢ but ask is at resolution
        );
        expect(isBookDead(book)).toBe(true);
    });

    it("handles unsorted levels correctly (finds best prices)", () => {
        // Polymarket doesn't guarantee sort order
        const book = makeBook(
            [["0.10", "100"], ["0.48", "500"], ["0.30", "200"]],  // best bid = 0.48
            [["0.80", "100"], ["0.52", "500"], ["0.60", "200"]]   // best ask = 0.52
        );
        // spread = 0.52 - 0.48 = 0.04 → healthy
        expect(isBookDead(book)).toBe(false);
    });
});

// ─── buildSyntheticOrderBook ────────────────────────────────────────

describe("buildSyntheticOrderBook", () => {
    it("creates 3 bid levels and 3 ask levels", () => {
        const book = buildSyntheticOrderBook(0.50);
        expect(book.bids).toHaveLength(3);
        expect(book.asks).toHaveLength(3);
    });

    it("bids are below price, asks are above price", () => {
        const book = buildSyntheticOrderBook(0.50);
        for (const bid of book.bids) {
            expect(parseFloat(bid.price)).toBeLessThan(0.50);
        }
        for (const ask of book.asks) {
            expect(parseFloat(ask.price)).toBeGreaterThan(0.50);
        }
    });

    it("all levels have depth of 5000 shares", () => {
        const book = buildSyntheticOrderBook(0.60);
        for (const level of [...book.bids, ...book.asks]) {
            expect(level.size).toBe("5000");
        }
    });

    it("clamps prices to valid range (0.01 - 0.99)", () => {
        const lowBook = buildSyntheticOrderBook(0.01);
        for (const bid of lowBook.bids) {
            expect(parseFloat(bid.price)).toBeGreaterThanOrEqual(0.01);
        }

        const highBook = buildSyntheticOrderBook(0.99);
        for (const ask of highBook.asks) {
            expect(parseFloat(ask.price)).toBeLessThanOrEqual(0.99);
        }
    });
});

// ─── calculateImpact ────────────────────────────────────────────────

describe("calculateImpact", () => {
    it("returns unfilled when no liquidity", () => {
        const emptyBook = makeBook([["0.50", "100"]], []);  // no asks
        const result = calculateImpact(emptyBook, "BUY", 100);

        expect(result.filled).toBe(false);
        expect(result.reason).toContain("No Liquidity");
    });

    it("BUY consumes asks ascending (cheapest first)", () => {
        const book = makeBook(
            [],
            [["0.60", "100"], ["0.50", "200"]]  // intentionally unsorted
        );
        // BUY $50: should consume cheaper ask first (0.50), getting 100 shares
        const result = calculateImpact(book, "BUY", 50);

        expect(result.filled).toBe(true);
        expect(result.executedPrice).toBeCloseTo(0.50, 2);
        expect(result.totalShares).toBeCloseTo(100, 0);
    });

    it("SELL consumes bids descending (highest first)", () => {
        const book = makeBook(
            [["0.40", "200"], ["0.50", "100"]],  // intentionally unsorted
            []
        );
        // SELL $50: Should consume highest bid first (0.50), getting 100 shares
        const result = calculateImpact(book, "SELL", 50);

        expect(result.filled).toBe(true);
        expect(result.executedPrice).toBeCloseTo(0.50, 2);
    });

    it("walks multiple levels for large orders", () => {
        const book = makeBook(
            [],
            [["0.50", "100"], ["0.51", "100"], ["0.52", "100"]]
        );
        // BUY $150: exhausts first two levels (0.50*100 + 0.51*100 = $101),
        // then partially fills third
        const result = calculateImpact(book, "BUY", 150);

        expect(result.filled).toBe(true);
        expect(result.executedPrice).toBeGreaterThan(0.50);
        expect(result.slippagePercent).toBeGreaterThan(0);
    });

    it("returns unfilled when insufficient depth (> $1 remaining)", () => {
        const book = makeBook(
            [],
            [["0.50", "10"]]  // Only $5 (0.50 * 10) of liquidity
        );
        const result = calculateImpact(book, "BUY", 100);

        expect(result.filled).toBe(false);
        expect(result.reason).toContain("Insufficient Depth");
    });

    it("allows $1 dust tolerance", () => {
        const book = makeBook(
            [],
            [["0.50", "198"]]  // $99 of liquidity
        );
        // BUY $100: $1 unfilled → within dust tolerance → filled
        const result = calculateImpact(book, "BUY", 100);

        expect(result.filled).toBe(true);
    });

    it("skips zero-price levels", () => {
        const book = makeBook(
            [],
            [["0.00", "1000"], ["0.50", "200"]]
        );
        const result = calculateImpact(book, "BUY", 50);

        // Should skip the 0.00 level and fill at 0.50
        expect(result.filled).toBe(true);
        expect(result.executedPrice).toBeCloseTo(0.50, 2);
    });

    it("reports zero slippage for single-level fills", () => {
        const book = makeBook(
            [],
            [["0.50", "500"]]
        );
        const result = calculateImpact(book, "BUY", 50);

        expect(result.filled).toBe(true);
        expect(result.slippagePercent).toBe(0);
    });

    // ─── NaN Regression Tests (Mar 9 2026 Incident) ─────────────────
    // Root cause: When all levels are skipped (price/size <= 0), totalSharesObj
    // stays 0. If remainingAmount <= $1 (dust guard), we reach the division
    // avgPrice = totalCostObj / totalSharesObj = 0 / 0 = NaN.

    it("never returns NaN when all levels have zero price (MAR-9 regression)", () => {
        const book = makeBook(
            [],
            [["0.00", "1000"], ["0.00", "500"]]  // All asks have price=0
        );
        const result = calculateImpact(book, "BUY", 0.50); // Small enough to pass dust guard

        expect(result.filled).toBe(false);
        expect(result.reason).toContain("No Valid Levels");
        // The critical assertion: no NaN anywhere
        expect(Number.isNaN(result.executedPrice)).toBe(false);
        expect(Number.isNaN(result.totalShares)).toBe(false);
        expect(Number.isNaN(result.slippagePercent)).toBe(false);
    });

    it("never returns NaN when all levels have zero size (MAR-9 regression)", () => {
        const book = makeBook(
            [],
            [["0.50", "0"], ["0.60", "0"]]  // All asks have size=0
        );
        const result = calculateImpact(book, "BUY", 0.50);

        expect(result.filled).toBe(false);
        expect(Number.isNaN(result.executedPrice)).toBe(false);
    });

    it("never returns NaN when all levels have negative price (MAR-9 regression)", () => {
        const book = makeBook(
            [["-0.10", "1000"]],  // All bids have negative price
            []
        );
        const result = calculateImpact(book, "SELL", 0.50);

        expect(result.filled).toBe(false);
        expect(Number.isNaN(result.executedPrice)).toBe(false);
    });

    it("never returns NaN with mix of invalid levels and small trade (MAR-9 regression)", () => {
        // This is the exact scenario: book has levels, all invalid, trade amount
        // is tiny enough to pass the $1 dust guard
        const book = makeBook(
            [],
            [["0.00", "0"], ["-1.00", "100"], ["0.00", "999"]]
        );
        const result = calculateImpact(book, "BUY", 0.01);

        expect(result.filled).toBe(false);
        expect(result.reason).toContain("No Valid Levels");
        expect(Number.isNaN(result.executedPrice)).toBe(false);
        expect(Number.isNaN(result.totalShares)).toBe(false);
    });
});
