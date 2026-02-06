import { describe, it, expect } from "vitest";
import { MarketService, OrderBook } from "@/lib/market";

// Mock Data
const mockBook: OrderBook = {
    // Sells (Asks): Users BUYING hit these
    asks: [
        { price: "0.50", size: "100" },  // $50 liquidity
        { price: "0.55", size: "1000" }, // $550 liquidity
        { price: "0.60", size: "5000" }  // $3000 liquidity
    ],
    // Buys (Bids): Users SELLING hit these
    bids: [
        { price: "0.49", size: "100" },
        { price: "0.48", size: "1000" }
    ]
};

describe("Market Impact Engine", () => {

    it("executes small order at top of book", () => {
        // Buy $10. Top level has $50 cap.
        const result = MarketService.calculateImpact(mockBook, "BUY", 10);

        expect(result.filled).toBe(true);
        expect(result.executedPrice).toBeCloseTo(0.50);
        expect(result.totalShares).toBe(20); // $10 / 0.50
    });

    it("executes medium order with slippage", () => {
        // Buy $100.
        // Needs $50 @ 0.50 (100 shares)
        // Needs $50 @ 0.55 (90.9 shares)
        // Total Shares = 190.9
        // Avg Price = 100 / 190.9 = 0.5238

        const result = MarketService.calculateImpact(mockBook, "BUY", 100);

        expect(result.filled).toBe(true);
        expect(result.executedPrice).toBeGreaterThan(0.50);
        expect(result.executedPrice).toBeLessThan(0.55);
        expect(result.slippagePercent).toBeGreaterThan(0);
    });

    it("rejects order larger than liquidity", () => {
        // Buy $1,000,000
        const result = MarketService.calculateImpact(mockBook, "BUY", 1000000);

        expect(result.filled).toBe(false);
        expect(result.reason).toContain("Insufficient Depth");
    });

});
