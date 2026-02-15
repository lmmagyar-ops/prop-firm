/**
 * PHANTOM PnL REPRODUCTION TEST
 * 
 * Root cause hunt: getPositionsWithPnL is a pure function.
 * Given exact soak-test inputs, which livePrices state produces $325 phantom PnL?
 */

import { describe, it, expect } from 'vitest';
import { getPositionsWithPnL, getEquityStats } from '@/lib/dashboard-service';

// ── Mock positions matching soak test ──
// OKC Thunder YES @ 36¢, AOC YES @ 10¢, Spain YES @ 16¢
// Total investment: 3 × $50 = $150
const MOCK_POSITIONS = [
    {
        id: 'pos-okc', marketId: 'tok-okc', direction: 'YES',
        entryPrice: '0.36', currentPrice: '0.36', shares: '138.89',
        sizeAmount: '50', status: 'OPEN', challengeId: 'ch-1',
        openedAt: new Date(), closedAt: null, pnl: null,
    },
    {
        id: 'pos-aoc', marketId: 'tok-aoc', direction: 'YES',
        entryPrice: '0.10', currentPrice: '0.10', shares: '500.00',
        sizeAmount: '50', status: 'OPEN', challengeId: 'ch-1',
        openedAt: new Date(), closedAt: null, pnl: null,
    },
    {
        id: 'pos-spain', marketId: 'tok-spain', direction: 'YES',
        entryPrice: '0.16', currentPrice: '0.16', shares: '312.50',
        sizeAmount: '50', status: 'OPEN', challengeId: 'ch-1',
        openedAt: new Date(), closedAt: null, pnl: null,
    },
];

const STARTING_BALANCE = 5000;
const CASH_BALANCE = STARTING_BALANCE - 150; // $4850

describe('PHANTOM PnL REPRODUCTION', () => {

    it('Scenario 1: no live prices → PnL should be $0', () => {
        const result = getPositionsWithPnL(MOCK_POSITIONS as never[], new Map(), new Map());
        const totalPnL = result.reduce((s, p) => s + p.unrealizedPnL, 0);
        const totalValue = result.reduce((s, p) => s + p.positionValue, 0);

        console.log('[Scenario 1] No live prices');
        for (const p of result) {
            console.log(`  ${p.marketId}: entry=${p.entryPrice} current=${p.currentPrice} value=${p.positionValue.toFixed(2)} pnl=${p.unrealizedPnL.toFixed(2)} source=${p.priceSource}`);
        }
        console.log(`  TOTAL: value=$${totalValue.toFixed(2)} pnl=$${totalPnL.toFixed(2)}`);

        expect(totalPnL).toBeCloseTo(0, 1);
        expect(totalValue).toBeCloseTo(150, 1);
    });

    it('Scenario 2: live prices = 50¢ → REPRODUCES phantom $325 PnL', () => {
        const fabricated = new Map<string, { price: string; source?: string }>();
        fabricated.set('tok-okc', { price: '0.50', source: 'fabricated' });
        fabricated.set('tok-aoc', { price: '0.50', source: 'fabricated' });
        fabricated.set('tok-spain', { price: '0.50', source: 'fabricated' });

        const result = getPositionsWithPnL(MOCK_POSITIONS as never[], fabricated, new Map());
        const totalPnL = result.reduce((s, p) => s + p.unrealizedPnL, 0);
        const totalValue = result.reduce((s, p) => s + p.positionValue, 0);

        console.log('[Scenario 2] Fabricated 50¢ prices');
        for (const p of result) {
            console.log(`  ${p.marketId}: entry=${p.entryPrice} current=${p.currentPrice} value=${p.positionValue.toFixed(2)} pnl=${p.unrealizedPnL.toFixed(2)} source=${p.priceSource}`);
        }
        console.log(`  TOTAL: value=$${totalValue.toFixed(2)} pnl=$${totalPnL.toFixed(2)}`);

        // This SHOULD reproduce the phantom PnL seen in prod
        expect(totalValue).toBeCloseTo(475.69, 0);
        expect(totalPnL).toBeCloseTo(325.69, 0);
    });

    it('Scenario 3: correct live prices → PnL should be $0', () => {
        const correct = new Map<string, { price: string; source?: string }>();
        correct.set('tok-okc', { price: '0.36', source: 'orderbook' });
        correct.set('tok-aoc', { price: '0.10', source: 'orderbook' });
        correct.set('tok-spain', { price: '0.16', source: 'orderbook' });

        const result = getPositionsWithPnL(MOCK_POSITIONS as never[], correct, new Map());
        const totalPnL = result.reduce((s, p) => s + p.unrealizedPnL, 0);
        const totalValue = result.reduce((s, p) => s + p.positionValue, 0);

        console.log('[Scenario 3] Correct live prices');
        for (const p of result) {
            console.log(`  ${p.marketId}: entry=${p.entryPrice} current=${p.currentPrice} value=${p.positionValue.toFixed(2)} pnl=${p.unrealizedPnL.toFixed(2)} source=${p.priceSource}`);
        }
        console.log(`  TOTAL: value=$${totalValue.toFixed(2)} pnl=$${totalPnL.toFixed(2)}`);

        expect(totalPnL).toBeCloseTo(0, 1);
        expect(totalValue).toBeCloseTo(150, 1);
    });

    it('Scenario 4: equity with fabricated prices = phantom $325', () => {
        const fabricated = new Map<string, { price: string; source?: string }>();
        fabricated.set('tok-okc', { price: '0.50', source: 'fabricated' });
        fabricated.set('tok-aoc', { price: '0.50', source: 'fabricated' });
        fabricated.set('tok-spain', { price: '0.50', source: 'fabricated' });

        const result = getPositionsWithPnL(MOCK_POSITIONS as never[], fabricated, new Map());
        const totalValue = result.reduce((s, p) => s + p.positionValue, 0);
        const equity = CASH_BALANCE + totalValue;

        const mockChallenge = {
            id: 'ch-1',
            startingBalance: STARTING_BALANCE.toString(),
            currentBalance: CASH_BALANCE.toString(),
            startOfDayBalance: STARTING_BALANCE.toString(),
        };

        const stats = getEquityStats(mockChallenge as never, equity, STARTING_BALANCE);

        console.log('[Scenario 4] Equity calculation');
        console.log(`  cash=$${CASH_BALANCE} + positions=$${totalValue.toFixed(2)} = equity=$${equity.toFixed(2)}`);
        console.log(`  PnL=$${stats.totalPnL.toFixed(2)}`);

        // This confirms: equity = $4850 + $475.69 = $5325.69, PnL = $325.69
        expect(stats.totalPnL).toBeCloseTo(325.69, 0);
    });

    it('GUARD: getPositionsWithPnL must NEVER produce phantom PnL from no-price fallback', () => {
        // The CRITICAL behavioral invariant:
        // If NO live prices are available, unrealized PnL MUST be 0.
        // Any non-zero PnL without live data = fabrication.
        const result = getPositionsWithPnL(MOCK_POSITIONS as never[], new Map(), new Map());

        for (const pos of result) {
            expect(
                pos.unrealizedPnL,
                `Position ${pos.marketId} has phantom PnL $${pos.unrealizedPnL.toFixed(2)} with no live price`
            ).toBeCloseTo(0, 2);

            expect(
                pos.priceSource,
                `Position ${pos.marketId} should use 'stored' source when no live price available`
            ).toBe('stored');
        }
    });
});
