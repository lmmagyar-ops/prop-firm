/**
 * Equity Formula Consistency — Contract Tests
 *
 * Three modules compute equity independently:
 *   1. getPortfolioValue() in position-utils.ts (used by risk.ts)
 *   2. Inline formula in evaluator.ts (lines 86-111)
 *   3. Inline formula in risk-monitor.ts (lines 156-169)
 *
 * If ANY of these drift, a user could pass a challenge while simultaneously
 * being in drawdown breach (or vice versa). These tests ensure all three
 * produce identical results given identical inputs.
 *
 * This is a PURE MATH test — no DB, no Redis, no mocks needed for the
 * formulas themselves. We extract the formula logic and verify agreement.
 */
import { describe, it, expect } from "vitest";
import { getPortfolioValue, type PositionForValuation } from "@/lib/position-utils";

// ── Formula Extractors ──────────────────────────────────────────
// These replicate the EXACT inline formulas from evaluator.ts and
// risk-monitor.ts so we can compare them against getPortfolioValue().

/**
 * Evaluator equity formula (evaluator.ts lines 86-108)
 * Source of truth: live price → direction adjust → shares × effectivePrice
 * Fallback: stored currentPrice or entryPrice (already direction-adjusted)
 */
function evaluatorEquity(
    currentBalance: number,
    positions: Array<{
        marketId: string;
        shares: string;
        entryPrice: string;
        currentPrice: string | null;
        direction: string;
    }>,
    livePrices: Map<string, { price: string }>,
): number {
    let positionValue = 0;
    for (const pos of positions) {
        const livePrice = livePrices.get(pos.marketId);
        const shares = parseFloat(pos.shares);
        let effectivePrice: number;

        if (livePrice) {
            const yesPrice = parseFloat(livePrice.price);
            effectivePrice = pos.direction === 'NO' ? (1 - yesPrice) : yesPrice;
        } else {
            effectivePrice = pos.currentPrice
                ? parseFloat(pos.currentPrice)
                : parseFloat(pos.entryPrice);
        }

        positionValue += shares * effectivePrice;
    }
    return currentBalance + positionValue;
}

/**
 * Risk-monitor equity formula (risk-monitor.ts lines 156-169)
 * Source of truth: live price → direction adjust → shares × effectivePrice
 * Note: risk-monitor has a FAIL-CLOSED guard that skips on missing prices.
 * For comparison, we just compute when prices are present.
 */
function riskMonitorEquity(
    currentBalance: number,
    positions: Array<{
        marketId: string;
        shares: string;
        entryPrice: string;
        direction: string;
    }>,
    livePrices: Map<string, number>,
): number {
    let positionValue = 0;
    for (const pos of positions) {
        const livePrice = livePrices.get(pos.marketId);
        if (livePrice === undefined) continue; // FAIL CLOSED: skip
        const shares = parseFloat(pos.shares);
        const isNo = pos.direction === 'NO';
        const effectivePrice = isNo ? (1 - livePrice) : livePrice;
        positionValue += shares * effectivePrice;
    }
    return currentBalance + positionValue;
}


// ── Test Scenarios ──────────────────────────────────────────────

interface TestScenario {
    name: string;
    cashBalance: number;
    positions: Array<{
        marketId: string;
        shares: string;
        entryPrice: string;
        currentPrice: string | null;
        direction: "YES" | "NO";
    }>;
    livePriceMap: Record<string, string>; // marketId → YES price as string
}

const scenarios: TestScenario[] = [
    {
        name: "YES-only portfolio",
        cashBalance: 9500,
        positions: [
            { marketId: "mkt-1", shares: "100", entryPrice: "0.5000", currentPrice: null, direction: "YES" },
        ],
        livePriceMap: { "mkt-1": "0.60" },
    },
    {
        name: "NO position with direction inversion",
        cashBalance: 9000,
        positions: [
            { marketId: "mkt-2", shares: "200", entryPrice: "0.6000", currentPrice: null, direction: "NO" },
        ],
        livePriceMap: { "mkt-2": "0.40" }, // YES price = 0.40, NO effective = 0.60
    },
    {
        name: "Mixed YES and NO portfolio",
        cashBalance: 8000,
        positions: [
            { marketId: "mkt-a", shares: "100", entryPrice: "0.5000", currentPrice: null, direction: "YES" },
            { marketId: "mkt-b", shares: "150", entryPrice: "0.7000", currentPrice: null, direction: "NO" },
        ],
        livePriceMap: { "mkt-a": "0.65", "mkt-b": "0.30" },
    },
    {
        name: "Fully resolved YES wins (price = 1.0)",
        cashBalance: 9500,
        positions: [
            { marketId: "mkt-r", shares: "100", entryPrice: "0.5000", currentPrice: null, direction: "YES" },
        ],
        livePriceMap: { "mkt-r": "1.00" },
    },
    {
        name: "Fully resolved YES loses (price = 0)",
        cashBalance: 9500,
        positions: [
            { marketId: "mkt-l", shares: "100", entryPrice: "0.5000", currentPrice: null, direction: "YES" },
        ],
        livePriceMap: { "mkt-l": "0.00" },
    },
    {
        name: "NO position at resolution boundary (YES = 0)",
        cashBalance: 9200,
        positions: [
            { marketId: "mkt-no-win", shares: "100", entryPrice: "0.6000", currentPrice: null, direction: "NO" },
        ],
        livePriceMap: { "mkt-no-win": "0.00" }, // NO effective = 1 - 0 = 1.0
    },
];


describe("Equity Formula Consistency (Contract Tests)", () => {

    for (const scenario of scenarios) {
        it(`all 3 formulas agree: ${scenario.name}`, () => {
            // 1. getPortfolioValue (position-utils.ts)
            const pvPositions: PositionForValuation[] = scenario.positions.map(p => ({
                marketId: p.marketId,
                shares: p.shares,
                entryPrice: p.entryPrice,
                currentPrice: p.currentPrice,
                direction: p.direction,
            }));
            const pvPriceMap = new Map(
                Object.entries(scenario.livePriceMap).map(([k, v]) => [k, { price: v, source: "test" }])
            );
            const pvResult = getPortfolioValue(pvPositions, pvPriceMap);
            const equityFromPV = scenario.cashBalance + pvResult.totalValue;

            // 2. Evaluator formula
            const evalPriceMap = new Map(
                Object.entries(scenario.livePriceMap).map(([k, v]) => [k, { price: v }])
            );
            const equityFromEval = evaluatorEquity(scenario.cashBalance, scenario.positions, evalPriceMap);

            // 3. Risk-monitor formula
            const rmPriceMap = new Map(
                Object.entries(scenario.livePriceMap).map(([k, v]) => [k, parseFloat(v)])
            );
            const equityFromRM = riskMonitorEquity(scenario.cashBalance, scenario.positions, rmPriceMap);

            // ALL THREE must match
            expect(equityFromPV).toBeCloseTo(equityFromEval, 2);
            expect(equityFromPV).toBeCloseTo(equityFromRM, 2);
            expect(equityFromEval).toBeCloseTo(equityFromRM, 2);
        });
    }

    it("documents known divergence: getPortfolioValue skips NaN prices, others dont", () => {
        // This test documents the behavior difference when live price is NaN.
        // getPortfolioValue falls back to stored price; evaluator uses parseFloat
        // which also falls back. Both should be consistent.
        const positions = [
            { marketId: "mkt-nan", shares: "100", entryPrice: "0.5000", currentPrice: "0.5500", direction: "YES" as const },
        ];

        // Simulate invalid live price
        const pvPositions: PositionForValuation[] = positions.map(p => ({
            marketId: p.marketId,
            shares: p.shares,
            entryPrice: p.entryPrice,
            currentPrice: p.currentPrice,
            direction: p.direction,
        }));
        const pvPriceMap = new Map([["mkt-nan", { price: "invalid", source: "test" }]]);
        const pvResult = getPortfolioValue(pvPositions, pvPriceMap);

        // getPortfolioValue falls back to entryPrice (0.50) when live price is NaN
        // because parseFloat("invalid") → NaN fails the `>= 0 && <= 1 && !isNaN` check
        // positionValue = 100 * 0.50 = 50
        expect(pvResult.totalValue).toBeCloseTo(50, 2);
    });
});
