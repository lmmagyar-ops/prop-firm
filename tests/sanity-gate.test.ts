/**
 * Challenge Pass Sanity Gate — Stabilization Phase 3
 *
 * These tests verify the sanity gate logic that guards challenge
 * promotions. They test the PURE FUNCTIONS and INVARIANTS, not
 * the database interactions.
 *
 * What we verify:
 * 1. PnL cross-reference math is correct
 * 2. Discrepancy percentage threshold works
 * 3. Suspicious speed detection criteria
 * 4. Edge cases (no trades, no SELL trades, negative PnL)
 */
import { describe, it, expect, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────
vi.mock('@/db', () => ({
    db: { query: {}, select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}));
vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
    }),
}));
vi.mock('@/lib/alerts', () => ({
    alerts: { tradeFailed: vi.fn(), anomaly: vi.fn() },
}));

// ─── Pure function extraction ────────────────────────────────
// These mirror the logic in evaluator.ts sanity gate, extracted
// for testability without ORM dependencies.

interface TradeRecord {
    type: string;
    realizedPnL: string | null;
}

interface PositionRecord {
    shares: string;
    entryPrice: string;
    direction: string;
    marketId: string;
}

/**
 * Calculate trade-derived profit from trade records + open positions.
 * This is the EXACT logic used in evaluator.ts sanity gate.
 */
function calculateTradeDerivedProfit(
    trades: TradeRecord[],
    openPositions: PositionRecord[],
    livePrices: Map<string, { price: string }>,
): number {
    const realizedPnLSum = trades
        .filter(t => t.type === 'SELL' && t.realizedPnL)
        .reduce((sum, t) => sum + parseFloat(t.realizedPnL!), 0);

    const unrealizedPnL = openPositions.reduce((sum, pos) => {
        const shares = parseFloat(pos.shares);
        const entry = parseFloat(pos.entryPrice);
        const liveData = livePrices.get(pos.marketId);
        if (!liveData) return sum;
        const yesPrice = parseFloat(liveData.price);
        const current = pos.direction === 'NO' ? (1 - yesPrice) : yesPrice;
        return sum + shares * (current - entry);
    }, 0);

    return realizedPnLSum + unrealizedPnL;
}

/**
 * Check if PnL discrepancy exceeds threshold.
 */
function shouldBlockPromotion(
    equityProfit: number,
    tradeDerivedProfit: number,
    profitTarget: number,
    thresholdPct: number = 20,
): boolean {
    const discrepancy = Math.abs(equityProfit - tradeDerivedProfit);
    const discrepancyPct = profitTarget > 0 ? (discrepancy / profitTarget) * 100 : 0;
    return discrepancyPct > thresholdPct;
}

/**
 * Check if challenge passed suspiciously fast.
 */
function isSuspiciousSpeed(
    startedAt: Date,
    sellCount: number,
    minHours: number = 24,
    minSells: number = 5,
): boolean {
    const hoursActive = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60);
    return hoursActive < minHours || sellCount < minSells;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('PnL Cross-Reference Gate', () => {
    it('matching PnL does NOT block promotion', () => {
        const trades: TradeRecord[] = [
            { type: 'BUY', realizedPnL: null },
            { type: 'SELL', realizedPnL: '500.00' },
            { type: 'SELL', realizedPnL: '300.00' },
        ];

        const derived = calculateTradeDerivedProfit(trades, [], new Map());
        // equity profit = $800, trade derived = $800 → 0% gap
        expect(shouldBlockPromotion(800, derived, 800)).toBe(false);
    });

    it('blocks when equity shows profit but trades show loss', () => {
        const trades: TradeRecord[] = [
            { type: 'SELL', realizedPnL: '-200.00' },
        ];

        const derived = calculateTradeDerivedProfit(trades, [], new Map());
        // equity says +$800, trades say -$200 → $1000 gap = 125% of target
        expect(shouldBlockPromotion(800, derived, 800)).toBe(true);
    });

    it('accounts for unrealized PnL from open positions', () => {
        const trades: TradeRecord[] = [
            { type: 'SELL', realizedPnL: '300.00' },
        ];

        const openPositions: PositionRecord[] = [
            { shares: '100', entryPrice: '0.50', direction: 'YES', marketId: 'm1' },
        ];

        const livePrices = new Map([
            ['m1', { price: '0.55' }], // 100 × (0.55 - 0.50) = $5 unrealized
        ]);

        const derived = calculateTradeDerivedProfit(trades, openPositions, livePrices);
        expect(derived).toBeCloseTo(305.00, 2); // 300 + 5
    });

    it('handles NO direction correctly in unrealized PnL', () => {
        const openPositions: PositionRecord[] = [
            { shares: '50', entryPrice: '0.40', direction: 'NO', marketId: 'm1' },
        ];

        // YES price = 0.55, so NO price = 0.45
        // PnL = 50 × (0.45 - 0.40) = $2.50
        const livePrices = new Map([
            ['m1', { price: '0.55' }],
        ]);

        const derived = calculateTradeDerivedProfit([], openPositions, livePrices);
        expect(derived).toBeCloseTo(2.50, 2);
    });

    it('skips positions without live prices (conservative)', () => {
        const openPositions: PositionRecord[] = [
            { shares: '100', entryPrice: '0.50', direction: 'YES', marketId: 'm1' },
        ];

        // No live price for m1
        const derived = calculateTradeDerivedProfit([], openPositions, new Map());
        expect(derived).toBe(0);
    });

    it('handles zero profit target without division by zero', () => {
        expect(shouldBlockPromotion(100, 50, 0)).toBe(false); // 0% discrepancy when target is 0
    });
});

describe('Suspicious Speed Detection', () => {
    it('flags challenge completed in < 24 hours', () => {
        const startedAt = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12h ago
        expect(isSuspiciousSpeed(startedAt, 10)).toBe(true);
    });

    it('flags challenge with < 5 sell trades', () => {
        const startedAt = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72h ago
        expect(isSuspiciousSpeed(startedAt, 3)).toBe(true);
    });

    it('does NOT flag normal challenge (>24h, >5 sells)', () => {
        const startedAt = new Date(Date.now() - 72 * 60 * 60 * 1000); // 72h ago
        expect(isSuspiciousSpeed(startedAt, 10)).toBe(false);
    });

    it('flags edge case: exactly 24h, exactly 5 sells', () => {
        // 24h and 5 sells are not suspicious (we check <24 and <5)
        const startedAt = new Date(Date.now() - 24.01 * 60 * 60 * 1000);
        expect(isSuspiciousSpeed(startedAt, 5)).toBe(false);
    });
});

describe('Edge Cases', () => {
    it('no trades at all → derived profit is 0', () => {
        const derived = calculateTradeDerivedProfit([], [], new Map());
        expect(derived).toBe(0);
    });

    it('only BUY trades → derived profit is 0 (no realized PnL)', () => {
        const trades: TradeRecord[] = [
            { type: 'BUY', realizedPnL: null },
            { type: 'BUY', realizedPnL: null },
        ];
        const derived = calculateTradeDerivedProfit(trades, [], new Map());
        expect(derived).toBe(0);
    });

    it('negative realized PnL is correctly summed', () => {
        const trades: TradeRecord[] = [
            { type: 'SELL', realizedPnL: '-100.00' },
            { type: 'SELL', realizedPnL: '-50.00' },
            { type: 'SELL', realizedPnL: '200.00' },
        ];
        const derived = calculateTradeDerivedProfit(trades, [], new Map());
        expect(derived).toBeCloseTo(50.00, 2); // -100 - 50 + 200 = 50
    });

    it('threshold of exactly 20% does NOT block', () => {
        // discrepancy = |800 - 640| = 160, pct = 160/800 * 100 = 20%
        // threshold is > 20, so exactly 20% should NOT block
        expect(shouldBlockPromotion(800, 640, 800, 20)).toBe(false);
    });

    it('threshold of 20.01% DOES block', () => {
        // discrepancy = |800 - 639| = 161, pct = 161/800 * 100 = 20.125%
        expect(shouldBlockPromotion(800, 639, 800, 20)).toBe(true);
    });
});
