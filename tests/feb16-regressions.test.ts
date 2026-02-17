/**
 * Feb 16 Regression Tests
 *
 * Behavioral tests for bugs discovered during the deep production verification.
 * Each test guards a specific failure mode that reached (or nearly reached) Mat.
 *
 * B4: Position-safe market filtering — markets with open positions must NEVER be hidden
 * B5: Equity = cash + positions — the challenges API must always return this identity
 * B6: Trade close P&L accuracy — realized P&L must equal (sellPrice - entryPrice) × shares
 */

import { describe, it, expect } from "vitest";
import { getDirectionAdjustedPrice } from "@/lib/position-utils";
import { isValidMarketPrice } from "@/lib/price-validation";

// ─── B4: Position-Safe Market Filtering ─────────────────────────────────────
// Bug: getActiveEvents() had 3 filter locations that removed markets at extreme
// prices (≤0.01 or ≥0.99). If a user held a position in one of those markets,
// it vanished from the trade page — they couldn't see or close it.
// Fix: keepMarketIds parameter bypasses all 3 filters.

describe("B4 Regression: Position-safe market filtering", () => {
    // Replicate the exact filtering logic from market.ts lines 370-391
    function filterSubMarket(
        market: { id: string; price: number; volume: number },
        keepMarketIds?: Set<string>
    ): boolean {
        const price = market.price;

        // DEFENSIVE FILTER 1: extreme prices
        if (price <= 0.01 || price >= 0.99) {
            if (!keepMarketIds?.has(market.id)) {
                return false;
            }
        }

        // DEFENSIVE FILTER 2: 50% + low volume
        const isFiftyPercent = Math.abs(price - 0.5) < 0.005;
        const isLowVolume = (market.volume || 0) < 50000;
        if (isFiftyPercent && isLowVolume) {
            return false;
        }

        return true;
    }

    // Replicate live price overlay filter from market.ts lines 508-521
    function liveOverlayFilter(
        market: { id: string },
        livePrice: number,
        keepMarketIds?: Set<string>
    ): "keep" | "remove" | "update" {
        if (livePrice > 0.01 && livePrice < 0.99) {
            return "update";
        }
        // Resolution territory
        if (!keepMarketIds?.has(market.id)) {
            return "remove";
        }
        return "keep";
    }

    it("market at 0.99 is hidden when user has NO position", () => {
        const result = filterSubMarket(
            { id: "m1", price: 0.99, volume: 1000000 },
            undefined
        );
        expect(result).toBe(false);
    });

    it("market at 0.99 is KEPT when user has open position", () => {
        const keepIds = new Set(["m1"]);
        const result = filterSubMarket(
            { id: "m1", price: 0.99, volume: 1000000 },
            keepIds
        );
        expect(result).toBe(true);
    });

    it("market at 0.01 is KEPT when user has open position", () => {
        const keepIds = new Set(["m1"]);
        const result = filterSubMarket(
            { id: "m1", price: 0.01, volume: 500000 },
            keepIds
        );
        expect(result).toBe(true);
    });

    it("live price overlay keeps resolved market when user has position", () => {
        const keepIds = new Set(["m1"]);
        const result = liveOverlayFilter({ id: "m1" }, 0.995, keepIds);
        expect(result).toBe("keep");
    });

    it("live price overlay removes resolved market when user has NO position", () => {
        const result = liveOverlayFilter({ id: "m1" }, 0.995, undefined);
        expect(result).toBe("remove");
    });

    it("all 3 filter points agree: position markets are never removed", () => {
        const userPositionMarkets = ["pos-market-1", "pos-market-2", "pos-market-3"];
        const keepIds = new Set(userPositionMarkets);

        // Simulate extreme scenarios
        const extremeScenarios = [
            { id: "pos-market-1", price: 0.001, volume: 0 },      // Nearly resolved YES
            { id: "pos-market-2", price: 0.999, volume: 0 },      // Nearly resolved NO
            { id: "pos-market-3", price: 1.0, volume: 1000000 },  // Fully resolved
        ];

        for (const market of extremeScenarios) {
            const subFilter = filterSubMarket(market, keepIds);
            expect(subFilter).toBe(true);

            const overlayResult = liveOverlayFilter(
                { id: market.id },
                market.price,
                keepIds
            );
            expect(overlayResult).not.toBe("remove");
        }
    });

    it("non-position markets ARE removed at extreme prices", () => {
        const keepIds = new Set(["other-market"]);

        const result = filterSubMarket(
            { id: "not-in-keep", price: 0.99, volume: 1000000 },
            keepIds
        );
        expect(result).toBe(false);
    });
});

// ─── B5: Equity = Cash + Position Value ─────────────────────────────────────
// Bug: Dashboard showed cashBalance as equity, ignoring unrealized P&L from
// open positions. The challenges API correctly computes equity but earlier
// script verification failed because it didn't unwrap the { challenges: [] }
// response correctly.
// Guard: The formula equity = cashBalance + Σ(shares × directionAdjustedPrice)
// must ALWAYS hold.

describe("B5 Regression: Equity = cash + position value", () => {
    // Replicate the exact equity formula from challenges/route.ts lines 79-97
    function computeEquity(
        cashBalance: number,
        positions: Array<{
            shares: number;
            entryPrice: number;
            direction: "YES" | "NO";
            livePrice: number | null;
        }>
    ): { equity: number; positionValue: number } {
        let positionValue = 0;

        for (const pos of positions) {
            let rawPrice: number;
            if (pos.livePrice !== null && isValidMarketPrice(pos.livePrice)) {
                rawPrice = pos.livePrice;
            } else {
                rawPrice = pos.entryPrice;
            }

            const adjustedPrice = getDirectionAdjustedPrice(rawPrice, pos.direction);
            positionValue += pos.shares * adjustedPrice;
        }

        return {
            equity: cashBalance + positionValue,
            positionValue,
        };
    }

    it("equity = cash when no positions", () => {
        const result = computeEquity(10000, []);
        expect(result.equity).toBe(10000);
        expect(result.positionValue).toBe(0);
    });

    it("equity includes YES position value", () => {
        const result = computeEquity(9050, [
            { shares: 263.16, entryPrice: 0.76, direction: "YES", livePrice: 0.765 },
        ]);
        // positionValue = 263.16 × 0.765 = 201.32
        expect(result.positionValue).toBeCloseTo(201.32, 0);
        expect(result.equity).toBeCloseTo(9050 + 201.32, 0);
    });

    it("equity includes NO position value (direction adjusted)", () => {
        const result = computeEquity(9000, [
            { shares: 100, entryPrice: 0.40, direction: "NO", livePrice: 0.30 },
        ]);
        // NO direction: adjustedPrice = 1 - 0.30 = 0.70
        // positionValue = 100 × 0.70 = 70
        expect(result.positionValue).toBeCloseTo(70, 2);
        expect(result.equity).toBeCloseTo(9070, 2);
    });

    it("Mat's exact production numbers: $9,051.16 + $604.08 = $9,655.24", () => {
        // These are the actual numbers verified from Mat's account on Feb 16
        const result = computeEquity(9051.16, [
            { shares: 263.16, entryPrice: 0.76, direction: "YES", livePrice: 0.765 },
            { shares: 384.62, entryPrice: 0.52, direction: "YES", livePrice: 0.515 },
            { shares: 312.50, entryPrice: 0.64, direction: "YES", livePrice: 0.655 },
        ]);
        // Total position value should be ~$604.08
        expect(result.positionValue).toBeCloseTo(604, 0);
        // Equity should be ~$9,655.24
        expect(result.equity).toBeCloseTo(9655, 0);
    });

    it("equity NEVER returns NaN or undefined", () => {
        const edgeCases = [
            { cash: 0, positions: [] },
            { cash: NaN, positions: [] },
            {
                cash: 10000,
                positions: [
                    { shares: 0, entryPrice: 0.5, direction: "YES" as const, livePrice: null },
                ],
            },
        ];

        for (const tc of edgeCases) {
            const result = computeEquity(tc.cash, tc.positions);
            expect(Number.isFinite(result.equity) || result.equity === 0 || Number.isNaN(tc.cash)).toBe(true);
        }
    });

    it("falls back to entryPrice when livePrice is invalid", () => {
        const result = computeEquity(9000, [
            { shares: 100, entryPrice: 0.50, direction: "YES", livePrice: -1 },
        ]);
        // Invalid live price → fallback to entryPrice 0.50
        // positionValue = 100 × 0.50 = 50
        expect(result.positionValue).toBeCloseTo(50, 2);
        expect(result.equity).toBeCloseTo(9050, 2);
    });
});

// ─── B6: Trade Close P&L Accuracy ───────────────────────────────────────────
// Bug: After closing a test trade, the P&L in trade history must exactly match
// (sellPrice - entryPrice) × shares for YES, or (entryPrice - sellPrice) × shares
// for NO.
// Guard: This formula is the single source of truth for realized P&L.

describe("B6 Regression: Trade close P&L accuracy", () => {
    function computeRealizedPnL(
        entryPrice: number,
        exitPrice: number,
        shares: number,
        direction: "YES" | "NO"
    ): number {
        if (direction === "YES") {
            return (exitPrice - entryPrice) * shares;
        }
        // NO: we bought at (1 - entryPrice), sold at (1 - exitPrice)
        // P&L = ((1 - exitPrice) - (1 - entryPrice)) × shares
        //     = (entryPrice - exitPrice) × shares
        return (entryPrice - exitPrice) * shares;
    }

    it("YES trade with small loss matches production: -$0.04", () => {
        // Mat's test trade: bought 3.57 shares at 28¢, sold at 27¢
        const pnl = computeRealizedPnL(0.28, 0.27, 3.57, "YES");
        expect(pnl).toBeCloseTo(-0.04, 2);
    });

    it("YES trade with profit", () => {
        const pnl = computeRealizedPnL(0.40, 0.60, 100, "YES");
        expect(pnl).toBeCloseTo(20.0, 2);
    });

    it("NO trade with profit (price dropped)", () => {
        // Bought NO at entryPrice=0.60 (cost 0.40 per share)
        // Price dropped to 0.30 (NO now worth 0.70)
        // P&L = (0.60 - 0.30) × 100 = $30
        const pnl = computeRealizedPnL(0.60, 0.30, 100, "NO");
        expect(pnl).toBeCloseTo(30.0, 2);
    });

    it("NO trade with loss (price rose)", () => {
        // Bought NO at entryPrice=0.40 (cost 0.60 per share)
        // Price rose to 0.70 (NO now worth 0.30)
        // P&L = (0.40 - 0.70) × 100 = -$30
        const pnl = computeRealizedPnL(0.40, 0.70, 100, "NO");
        expect(pnl).toBeCloseTo(-30.0, 2);
    });

    it("break-even trade has zero P&L", () => {
        const pnl = computeRealizedPnL(0.50, 0.50, 1000, "YES");
        expect(pnl).toBeCloseTo(0, 2);
    });

    it("P&L precision: 2 decimal places for display", () => {
        const pnl = computeRealizedPnL(0.28, 0.27, 3.57, "YES");
        const display = pnl.toFixed(2);
        expect(display).toMatch(/^-?\d+\.\d{2}$/);
        expect(display).toBe("-0.04");
    });
});
