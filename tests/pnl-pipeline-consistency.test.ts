/**
 * PnL Pipeline Consistency Test
 *
 * ROOT CAUSE: The Feb 2026 PnL mismatch bug happened because
 * /api/trade/positions computed PnL inline with its own formula,
 * while the Portfolio used getPortfolioValue() from position-utils.ts.
 * When one was updated and the other wasn't, they diverged.
 *
 * This test locks the invariant: for identical inputs, the API route's
 * inline formula and getPortfolioValue() MUST produce identical PnL.
 */

import { describe, it, expect } from 'vitest';
import {
    getPortfolioValue,
    getDirectionAdjustedPrice,
    calculatePositionMetrics,
    type PositionForValuation,
} from '@/lib/position-utils';

// ── Helper: replicate the EXACT inline computation from /api/trade/positions ──
// See: src/app/api/trade/positions/route.ts lines 98-103
function computePnLLikeApiRoute(
    shares: number,
    entryPrice: number,
    rawYesPrice: number,
    direction: 'YES' | 'NO'
): number {
    const effectiveCurrentPrice = getDirectionAdjustedPrice(rawYesPrice, direction);
    const effectiveEntryPrice = entryPrice; // Already direction-adjusted in DB
    return (effectiveCurrentPrice - effectiveEntryPrice) * shares;
}

describe('PnL Pipeline Consistency', () => {
    const TEST_CASES: Array<{
        label: string;
        shares: number;
        entryPrice: number;
        rawYesPrice: number;
        direction: 'YES' | 'NO';
    }> = [
            // Real production positions from Feb 17, 2026
            { label: 'Solana (NO)', shares: 271.74, entryPrice: 0.92, rawYesPrice: 0.089, direction: 'NO' },
            { label: 'BTC Up/Down (YES)', shares: 672.7, entryPrice: 0.5946, rawYesPrice: 0.0005, direction: 'YES' },
            { label: 'BTC above _ (YES)', shares: 462.96, entryPrice: 0.54, rawYesPrice: 0.0005, direction: 'YES' },
            { label: 'BTC price (YES)', shares: 53.19, entryPrice: 0.47, rawYesPrice: 0.0005, direction: 'YES' },
            // Edge cases
            { label: 'At entry (YES)', shares: 100, entryPrice: 0.65, rawYesPrice: 0.65, direction: 'YES' },
            { label: 'At entry (NO)', shares: 100, entryPrice: 0.35, rawYesPrice: 0.65, direction: 'NO' },
            { label: 'Full win (YES)', shares: 100, entryPrice: 0.50, rawYesPrice: 0.99, direction: 'YES' },
            { label: 'Full loss (YES)', shares: 100, entryPrice: 0.80, rawYesPrice: 0.01, direction: 'YES' },
            { label: 'Full win (NO)', shares: 100, entryPrice: 0.50, rawYesPrice: 0.01, direction: 'NO' },
        ];

    it.each(TEST_CASES)(
        'API route and getPortfolioValue agree on PnL for $label',
        ({ shares, entryPrice, rawYesPrice, direction }) => {
            // Path A: the inline computation from /api/trade/positions
            const apiPnL = computePnLLikeApiRoute(shares, entryPrice, rawYesPrice, direction);

            // Path B: getPortfolioValue from position-utils.ts
            const positions: PositionForValuation[] = [{
                marketId: 'test-market',
                shares: shares.toString(),
                entryPrice: entryPrice.toString(),
                direction,
            }];
            const livePrices = new Map([
                ['test-market', { price: rawYesPrice.toString() }],
            ]);
            const portfolioResult = getPortfolioValue(positions, livePrices);
            const portfolioPnL = portfolioResult.positions[0].unrealizedPnL;

            // INVARIANT: Both paths must agree exactly
            expect(apiPnL).toBeCloseTo(portfolioPnL, 10);
        }
    );

    it.each(TEST_CASES)(
        'API route and calculatePositionMetrics agree on PnL for $label',
        ({ shares, entryPrice, rawYesPrice, direction }) => {
            // Path A: the inline computation from /api/trade/positions
            const apiPnL = computePnLLikeApiRoute(shares, entryPrice, rawYesPrice, direction);

            // Path C: calculatePositionMetrics from position-utils.ts
            const metrics = calculatePositionMetrics(shares, entryPrice, rawYesPrice, direction);

            // INVARIANT: Both paths must agree exactly
            expect(apiPnL).toBeCloseTo(metrics.unrealizedPnL, 10);
        }
    );

    it('all three PnL computation paths produce identical results', () => {
        // Use a complex case: NO direction with non-trivial numbers
        const shares = 271.74;
        const entryPrice = 0.92;
        const rawYesPrice = 0.089;
        const direction = 'NO' as const;

        const apiPnL = computePnLLikeApiRoute(shares, entryPrice, rawYesPrice, direction);

        const positions: PositionForValuation[] = [{
            marketId: 'consistency-check',
            shares: shares.toString(),
            entryPrice: entryPrice.toString(),
            direction,
        }];
        const livePrices = new Map([
            ['consistency-check', { price: rawYesPrice.toString() }],
        ]);
        const portfolioPnL = getPortfolioValue(positions, livePrices).positions[0].unrealizedPnL;
        const metricsPnL = calculatePositionMetrics(shares, entryPrice, rawYesPrice, direction).unrealizedPnL;

        // All three must be identical
        expect(apiPnL).toBe(portfolioPnL);
        expect(apiPnL).toBe(metricsPnL);
        expect(portfolioPnL).toBe(metricsPnL);
    });
});
