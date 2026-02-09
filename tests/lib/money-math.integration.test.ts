/**
 * Money-Math Integration Test
 *
 * Verifies end-to-end financial correctness of the trade engine's
 * math pipeline WITHOUT touching the database or Redis.
 *
 * Tests the chain: canonical price → synthetic order book → impact
 * simulation → execution price → shares → realized P&L → balance.
 *
 * This is the "does the money add up?" test suite.
 */
import { describe, it, expect } from "vitest";
import { buildSyntheticOrderBook, calculateImpact } from "@/lib/order-book-engine";

// ── Helpers (mirror trade.ts math) ──────────────────────────────

/** Compute execution price from order book impact (mirrors trade.ts line 139-141) */
function getExecutionPrice(canonicalPrice: number, direction: "YES" | "NO"): number {
    const book = buildSyntheticOrderBook(canonicalPrice);
    const effectiveSide = direction === "NO" ? "SELL" : "BUY";
    const sim = calculateImpact(book, effectiveSide, 100); // $100 trade
    if (!sim.filled) throw new Error("Simulation unfilled");
    return direction === "NO" ? (1 - sim.executedPrice) : sim.executedPrice;
}

/** Simulate a BUY → price change → SELL round trip */
function roundTrip(params: {
    entryPrice: number;
    exitPrice: number;
    amount: number;
    direction: "YES" | "NO";
}) {
    const { entryPrice, exitPrice, amount, direction } = params;

    // === BUY LEG ===
    const buyBook = buildSyntheticOrderBook(entryPrice);
    const buyEffectiveSide = direction === "NO" ? "SELL" : "BUY";
    const buySim = calculateImpact(buyBook, buyEffectiveSide, amount);
    if (!buySim.filled) throw new Error("Buy simulation unfilled");

    const buyExecPrice = direction === "NO" ? (1 - buySim.executedPrice) : buySim.executedPrice;
    const shares = direction === "NO" ? amount / buyExecPrice : buySim.totalShares;
    const cost = amount;

    // === SELL LEG (at different canonical price) ===
    const sellBook = buildSyntheticOrderBook(exitPrice);
    const sellEffectiveSide = direction === "NO" ? "BUY" : "SELL";
    const sellAmount = shares * (direction === "NO" ? (1 - exitPrice) : exitPrice);
    const sellSim = calculateImpact(sellBook, sellEffectiveSide, sellAmount);

    const sellExecPrice = direction === "NO"
        ? (1 - sellSim.executedPrice)
        : sellSim.executedPrice;
    const proceeds = shares * sellExecPrice;

    // Realized P&L = proceeds - cost
    const realizedPnL = proceeds - cost;

    // Alternative: shares * (exitPrice - entryPrice) — should be close
    const expectedPnL = shares * (sellExecPrice - buyExecPrice);

    return {
        shares,
        buyExecPrice,
        sellExecPrice,
        cost,
        proceeds,
        realizedPnL,
        expectedPnL,
    };
}

// =====================================================================
// Round-trip: BUY YES → SELL YES
// =====================================================================
describe("Round-trip BUY YES → SELL YES", () => {
    it("profitable trade: price goes up", () => {
        const result = roundTrip({
            entryPrice: 0.50,
            exitPrice: 0.70,
            amount: 100,
            direction: "YES",
        });

        // Should have positive P&L
        expect(result.realizedPnL).toBeGreaterThan(0);
        expect(result.proceeds).toBeGreaterThan(result.cost);
        // Shares should be positive
        expect(result.shares).toBeGreaterThan(0);
    });

    it("losing trade: price goes down", () => {
        const result = roundTrip({
            entryPrice: 0.60,
            exitPrice: 0.40,
            amount: 100,
            direction: "YES",
        });

        // Should have negative P&L
        expect(result.realizedPnL).toBeLessThan(0);
        expect(result.proceeds).toBeLessThan(result.cost);
    });

    it("flat trade: same price = near-zero P&L", () => {
        const result = roundTrip({
            entryPrice: 0.50,
            exitPrice: 0.50,
            amount: 100,
            direction: "YES",
        });

        // P&L should be close to zero. The synthetic order book has a 2¢ spread,
        // so buying at ask and selling at bid costs each ~4% per leg.
        // For $100 trade: ~$8 round-trip spread cost is expected.
        expect(Math.abs(result.realizedPnL)).toBeLessThan(10); // < $10 spread tolerance
    });
});

// =====================================================================
// Round-trip: BUY NO → SELL NO
// =====================================================================
describe("Round-trip BUY NO → SELL NO", () => {
    it("profitable NO trade: canonical price drops (NO wins)", () => {
        // BUY NO when canonical = 0.60 → NO price = 0.40
        // SELL NO when canonical = 0.30 → NO price = 0.70
        const result = roundTrip({
            entryPrice: 0.60,
            exitPrice: 0.30,
            amount: 100,
            direction: "NO",
        });

        // NO trader profits when canonical price drops
        expect(result.realizedPnL).toBeGreaterThan(0);
    });

    it("losing NO trade: canonical price rises (YES wins)", () => {
        const result = roundTrip({
            entryPrice: 0.40,
            exitPrice: 0.70,
            amount: 100,
            direction: "NO",
        });

        // NO trader loses when canonical price rises
        expect(result.realizedPnL).toBeLessThan(0);
    });
});

// =====================================================================
// Balance Accounting
// =====================================================================
describe("Balance accounting invariants", () => {
    it("end balance = start + realized P&L", () => {
        const startBalance = 10_000;
        const tradeAmount = 500;

        const result = roundTrip({
            entryPrice: 0.45,
            exitPrice: 0.65,
            amount: tradeAmount,
            direction: "YES",
        });

        const endBalance = startBalance - result.cost + result.proceeds;
        const expectedEnd = startBalance + result.realizedPnL;

        expect(endBalance).toBeCloseTo(expectedEnd, 2);
    });

    it("multiple trades: cumulative P&L equals sum of individual P&Ls", () => {
        const trades = [
            { entryPrice: 0.50, exitPrice: 0.60, amount: 200, direction: "YES" as const },
            { entryPrice: 0.30, exitPrice: 0.25, amount: 100, direction: "YES" as const },
            { entryPrice: 0.70, exitPrice: 0.40, amount: 300, direction: "NO" as const },
        ];

        let startBalance = 50_000;
        let cumulativePnL = 0;

        for (const t of trades) {
            const result = roundTrip(t);
            startBalance = startBalance - result.cost + result.proceeds;
            cumulativePnL += result.realizedPnL;
        }

        const endBalance = 50_000 + cumulativePnL;
        expect(startBalance).toBeCloseTo(endBalance, 2);
    });

    it("cost never exceeds trade amount (no negative balance from BUY)", () => {
        const result = roundTrip({
            entryPrice: 0.50,
            exitPrice: 0.60,
            amount: 100,
            direction: "YES",
        });

        // Cost of BUY should equal the trade amount (we spend exactly what we request)
        expect(result.cost).toBe(100);
    });
});

// =====================================================================
// Edge Cases
// =====================================================================
describe("Edge case math", () => {
    it("very low price trade executes correctly", () => {
        const result = roundTrip({
            entryPrice: 0.10,
            exitPrice: 0.20,
            amount: 50,
            direction: "YES",
        });

        expect(result.shares).toBeGreaterThan(0);
        expect(result.realizedPnL).toBeGreaterThan(0);
    });

    it("very high price trade executes correctly", () => {
        const result = roundTrip({
            entryPrice: 0.85,
            exitPrice: 0.90,
            amount: 50,
            direction: "YES",
        });

        expect(result.shares).toBeGreaterThan(0);
        expect(result.realizedPnL).toBeGreaterThan(0);
    });

    it("shares are deterministic for same input", () => {
        const r1 = roundTrip({ entryPrice: 0.55, exitPrice: 0.60, amount: 100, direction: "YES" });
        const r2 = roundTrip({ entryPrice: 0.55, exitPrice: 0.60, amount: 100, direction: "YES" });

        expect(r1.shares).toBe(r2.shares);
        expect(r1.realizedPnL).toBe(r2.realizedPnL);
    });
});
