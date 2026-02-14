/**
 * Behavioral tests for Mat's drawdown bug fixes (Feb 14, 2026).
 * 
 * Tests the SYSTEM BEHAVIOR, not implementation details:
 * 1. Max drawdown denominator is dynamic (startOfDayBalance - floor)
 * 2. Position valuation never drops below entry price (price source mismatch fix)
 */
import { describe, it, expect } from 'vitest';
import { getEquityStats, getPositionsWithPnL } from '@/lib/dashboard-service';
import type { DbChallengeRow, DbPositionRow } from '@/lib/dashboard-service';

// ─── Helpers ────────────────────────────────────────────────────────

function makeChallenge(overrides: Partial<DbChallengeRow> = {}): DbChallengeRow {
    return {
        id: 'test-challenge-1',
        userId: 'test-user-1',
        status: 'active',
        phase: 'challenge',
        startingBalance: '10000',
        currentBalance: '9500',
        highWaterMark: '10300',
        startOfDayBalance: '10283',
        rulesConfig: {
            maxDrawdown: 1000,
            profitTarget: 1000,
            maxDailyDrawdownPercent: 0.05,
        },
        platform: 'polymarket',
        startedAt: new Date(),
        endsAt: null,
        pendingFailureAt: null,
        lastDailyResetAt: null,
        isPublicOnProfile: false,
        showDropdownOnProfile: false,
        profitSplit: null,
        payoutCap: null,
        lastPayoutAt: null,
        totalPaidOut: '0',
        activeTradingDays: 0,
        consistencyFlagged: false,
        lastActivityAt: null,
        payoutCycleStart: null,
        ...overrides,
    } as DbChallengeRow;
}

function makePosition(overrides: Partial<DbPositionRow> = {}): DbPositionRow {
    return {
        id: 'test-pos-1',
        challengeId: 'test-challenge-1',
        marketId: 'market-abc-123',
        direction: 'YES',
        shares: '1000',
        sizeAmount: '250',
        entryPrice: '0.25',
        currentPrice: '0.25',
        status: 'OPEN',
        openedAt: new Date(),
        closedAt: null,
        closedPrice: null,
        pnl: null,
        ...overrides,
    } as DbPositionRow;
}

// ─── Bug 1: Dynamic Drawdown Denominator ────────────────────────────

describe('Bug 1: Max Drawdown Denominator', () => {
    it('returns dynamic allowance based on startOfDayBalance - floor', () => {
        const challenge = makeChallenge({
            startingBalance: '10000',
            startOfDayBalance: '10500',
            highWaterMark: '10500',
        });
        // floor = 10000 - 1000 = 9000
        // allowance = 10500 - 9000 = 1500
        const stats = getEquityStats(challenge, 10200, 10000);
        expect(stats.maxDrawdownAllowance).toBe(1500);
    });

    it('allowance equals static maxDrawdown when startOfDay = startingBalance', () => {
        const challenge = makeChallenge({
            startingBalance: '10000',
            startOfDayBalance: '10000',
            highWaterMark: '10000',
        });
        // floor = 10000 - 1000 = 9000
        // allowance = 10000 - 9000 = 1000 (same as static)
        const stats = getEquityStats(challenge, 9800, 10000);
        expect(stats.maxDrawdownAllowance).toBe(1000);
    });

    it('allowance grows when trader is profitable', () => {
        const challenge = makeChallenge({
            startingBalance: '10000',
            startOfDayBalance: '11000',
            highWaterMark: '11000',
        });
        // floor = 10000 - 1000 = 9000
        // allowance = 11000 - 9000 = 2000 (2x the static limit!)
        const stats = getEquityStats(challenge, 10500, 10000);
        expect(stats.maxDrawdownAllowance).toBe(2000);
    });

    it('allowance is never negative (edge: startOfDay below floor)', () => {
        const challenge = makeChallenge({
            startingBalance: '10000',
            startOfDayBalance: '8500', // Below floor of 9000
            highWaterMark: '10000',
        });
        const stats = getEquityStats(challenge, 8500, 10000);
        expect(stats.maxDrawdownAllowance).toBe(0);
    });
});

// ─── Bug 2: Position Valuation Floor at Entry Price ─────────────────

describe('Bug 2: Position Valuation Uses Live Price Correctly', () => {
    it('passes through live price for mark-to-market when above entry', () => {
        const pos = makePosition({
            entryPrice: '0.25',
            shares: '1000',
            sizeAmount: '250',
        });

        // Live price above entry — should show the gain
        const livePrices = new Map([
            ['market-abc-123', { price: '0.30', source: 'live' }],
        ]);
        const titles = new Map([['market-abc-123', 'Test Market']]);

        const result = getPositionsWithPnL([pos], livePrices, titles);
        expect(result).toHaveLength(1);
        expect(result[0].currentPrice).toBe(0.30);
        expect(result[0].positionValue).toBeCloseTo(300, 2); // 1000 * 0.30
        expect(result[0].unrealizedPnL).toBeCloseTo(50, 2);  // (0.30 - 0.25) * 1000
    });

    it('passes through live price for mark-to-market when below entry', () => {
        const pos = makePosition({
            entryPrice: '0.25',
            shares: '1000',
            sizeAmount: '250',
        });

        // Live price below entry — shows legitimate loss
        // (The mid-price fix is upstream in getBatchOrderBookPrices, not here)
        const livePrices = new Map([
            ['market-abc-123', { price: '0.20', source: 'live' }],
        ]);
        const titles = new Map([['market-abc-123', 'Test Market']]);

        const result = getPositionsWithPnL([pos], livePrices, titles);
        expect(result).toHaveLength(1);
        expect(result[0].currentPrice).toBe(0.20);
        expect(result[0].positionValue).toBeCloseTo(200, 2);
        expect(result[0].unrealizedPnL).toBeCloseTo(-50, 2);
    });

    it('returns zero PnL when no live price (uses stored entry)', () => {
        const pos = makePosition({
            entryPrice: '0.25',
            currentPrice: '0.25', // Same as entry on creation
            shares: '1000',
            sizeAmount: '250',
        });

        // No live price available
        const livePrices = new Map<string, { price: string; source?: string }>();
        const titles = new Map([['market-abc-123', 'Test Market']]);

        const result = getPositionsWithPnL([pos], livePrices, titles);
        expect(result).toHaveLength(1);
        expect(result[0].currentPrice).toBe(0.25);
        expect(result[0].positionValue).toBe(250);
        expect(result[0].unrealizedPnL).toBe(0);
    });

    it('handles NO direction positions correctly', () => {
        const pos = makePosition({
            direction: 'NO',
            entryPrice: '0.75', // NO entry = 1 - 0.25 YES price = 0.75
            shares: '333.33',
            sizeAmount: '250',
        });

        // Live YES price = 0.20 → NO effective = 1 - 0.20 = 0.80 (above entry of 0.75 = gain)
        const livePrices = new Map([
            ['market-abc-123', { price: '0.20', source: 'live' }],
        ]);
        const titles = new Map([['market-abc-123', 'Test Market']]);

        const result = getPositionsWithPnL([pos], livePrices, titles);
        expect(result).toHaveLength(1);
        expect(result[0].currentPrice).toBe(0.80); // 1 - 0.20
        expect(result[0].unrealizedPnL).toBeCloseTo(16.67, 0); // (0.80 - 0.75) * 333.33
    });
});
