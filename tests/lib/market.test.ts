import { describe, it, expect } from "vitest";
import {
    calculateImpact,
    buildSyntheticOrderBook,
    isBookDead,
    invertOrderBook,
} from "@/lib/order-book-engine";
import type { OrderBook } from "@/lib/market";

// ── Fixtures ──────────────────────────────────────────────────────
const healthyBook: OrderBook = {
    asks: [
        { price: "0.50", size: "100" },  // $50  liquidity
        { price: "0.55", size: "1000" }, // $550 liquidity
        { price: "0.60", size: "5000" }, // $3000 liquidity
    ],
    bids: [
        { price: "0.49", size: "100" },
        { price: "0.48", size: "1000" },
    ],
};

// =====================================================================
// calculateImpact
// =====================================================================
describe("calculateImpact", () => {
    it("executes small order at top of book", () => {
        const result = calculateImpact(healthyBook, "BUY", 10);

        expect(result.filled).toBe(true);
        expect(result.executedPrice).toBeCloseTo(0.50);
        expect(result.totalShares).toBe(20); // $10 / 0.50
        expect(result.slippagePercent).toBe(0);
    });

    it("executes medium order with slippage across levels", () => {
        // $100: $50 @ 0.50 (100 shares) + $50 @ 0.55 (90.9 shares)
        const result = calculateImpact(healthyBook, "BUY", 100);

        expect(result.filled).toBe(true);
        expect(result.executedPrice).toBeGreaterThan(0.50);
        expect(result.executedPrice).toBeLessThan(0.55);
        expect(result.slippagePercent).toBeGreaterThan(0);
    });

    it("rejects order larger than total book depth", () => {
        const result = calculateImpact(healthyBook, "BUY", 1_000_000);

        expect(result.filled).toBe(false);
        expect(result.reason).toContain("Insufficient Depth");
    });

    it("SELL walks bids, not asks", () => {
        const result = calculateImpact(healthyBook, "SELL", 10);

        expect(result.filled).toBe(true);
        // Sells hit bids, so top price is 0.49
        expect(result.executedPrice).toBeCloseTo(0.49);
    });

    it("returns no liquidity on empty book", () => {
        const empty: OrderBook = { bids: [], asks: [] };
        const result = calculateImpact(empty, "BUY", 10);

        expect(result.filled).toBe(false);
        expect(result.reason).toBe("No Liquidity");
    });

    it("skips levels with zero price or zero size", () => {
        const bookWithGarbage: OrderBook = {
            asks: [
                { price: "0.00", size: "100" },   // skip
                { price: "0.50", size: "0" },      // skip
                { price: "0.60", size: "1000" },   // actual liquidity
            ],
            bids: [],
        };

        const result = calculateImpact(bookWithGarbage, "BUY", 10);
        expect(result.filled).toBe(true);
        expect(result.executedPrice).toBeCloseTo(0.60);
    });

    it("allows $1 dust tolerance for partial fills", () => {
        // Build a book with exactly $50 liquidity
        const tinyBook: OrderBook = {
            asks: [{ price: "0.50", size: "100" }], // $50 total
            bids: [],
        };

        // Request $50.50 — $0.50 unfilled, within $1 dust tolerance
        const result = calculateImpact(tinyBook, "BUY", 50.50);
        expect(result.filled).toBe(true);
    });

    it("rejects when unfilled amount exceeds $1 dust tolerance", () => {
        const tinyBook: OrderBook = {
            asks: [{ price: "0.50", size: "100" }],
            bids: [],
        };

        // Request $52 — $2 unfilled, exceeds $1 tolerance
        const result = calculateImpact(tinyBook, "BUY", 52);
        expect(result.filled).toBe(false);
    });
});

// =====================================================================
// buildSyntheticOrderBook
// =====================================================================
describe("buildSyntheticOrderBook", () => {
    it("builds book centered around mid-range price", () => {
        const book = buildSyntheticOrderBook(0.50);

        expect(book.bids).toHaveLength(3);
        expect(book.asks).toHaveLength(3);
        // Bid spread: 0.48, 0.46, 0.44
        expect(parseFloat(book.bids[0].price)).toBe(0.48);
        // Ask spread: 0.52, 0.54, 0.56
        expect(parseFloat(book.asks[0].price)).toBe(0.52);
    });

    it("clamps bids to 0.01 for low prices", () => {
        const book = buildSyntheticOrderBook(0.02);

        // All bids should be clamped to 0.01
        for (const bid of book.bids) {
            expect(parseFloat(bid.price)).toBeGreaterThanOrEqual(0.01);
        }
    });

    it("clamps asks to 0.99 for high prices", () => {
        const book = buildSyntheticOrderBook(0.98);

        // All asks should be clamped to 0.99
        for (const ask of book.asks) {
            expect(parseFloat(ask.price)).toBeLessThanOrEqual(0.99);
        }
    });

    it("each level has 5000 shares depth", () => {
        const book = buildSyntheticOrderBook(0.50);

        for (const level of [...book.bids, ...book.asks]) {
            expect(level.size).toBe("5000");
        }
    });
});

// =====================================================================
// isBookDead
// =====================================================================
describe("isBookDead", () => {
    it("returns false for healthy book", () => {
        expect(isBookDead(healthyBook)).toBe(false);
    });

    it("returns true when asks are empty", () => {
        expect(isBookDead({ bids: [{ price: "0.49", size: "100" }], asks: [] })).toBe(true);
    });

    it("returns true when bids are empty", () => {
        expect(isBookDead({ bids: [], asks: [{ price: "0.50", size: "100" }] })).toBe(true);
    });

    it("returns true when spread exceeds 50¢", () => {
        const wideSpread: OrderBook = {
            asks: [{ price: "0.80", size: "100" }],
            bids: [{ price: "0.20", size: "100" }],
        };
        expect(isBookDead(wideSpread)).toBe(true);
    });

    it("returns true when best ask is in resolution territory (≥90¢)", () => {
        const nearResolution: OrderBook = {
            asks: [{ price: "0.95", size: "100" }],
            bids: [{ price: "0.90", size: "100" }],
        };
        expect(isBookDead(nearResolution)).toBe(true);
    });

    it("returns false for tight spread below 90¢", () => {
        const tight: OrderBook = {
            asks: [{ price: "0.55", size: "100" }],
            bids: [{ price: "0.50", size: "100" }],
        };
        expect(isBookDead(tight)).toBe(false);
    });
});

// =====================================================================
// invertOrderBook
// =====================================================================
describe("invertOrderBook", () => {
    it("inverts NO bids to YES asks and NO asks to YES bids", () => {
        const noBook: OrderBook = {
            bids: [{ price: "0.40", size: "100" }, { price: "0.35", size: "200" }],
            asks: [{ price: "0.45", size: "300" }, { price: "0.50", size: "400" }],
        };

        const yesBook = invertOrderBook(noBook);

        // NO bids @ 0.40, 0.35 → YES asks @ 0.60, 0.65 (sorted ascending)
        expect(yesBook.asks).toHaveLength(2);
        expect(yesBook.asks[0].price).toBe("0.60");
        expect(yesBook.asks[1].price).toBe("0.65");
        expect(yesBook.asks[0].size).toBe("100");

        // NO asks @ 0.45, 0.50 → YES bids @ 0.55, 0.50 (sorted descending)
        expect(yesBook.bids).toHaveLength(2);
        expect(yesBook.bids[0].price).toBe("0.55");
        expect(yesBook.bids[1].price).toBe("0.50");
    });

    it("handles empty NO book", () => {
        const emptyNo: OrderBook = { bids: [], asks: [] };
        const yesBook = invertOrderBook(emptyNo);

        expect(yesBook.bids).toHaveLength(0);
        expect(yesBook.asks).toHaveLength(0);
    });

    it("preserves sizes through inversion", () => {
        const noBook: OrderBook = {
            bids: [{ price: "0.30", size: "999" }],
            asks: [{ price: "0.70", size: "1234" }],
        };

        const yesBook = invertOrderBook(noBook);

        expect(yesBook.asks[0].size).toBe("999");
        expect(yesBook.bids[0].size).toBe("1234");
    });
});
