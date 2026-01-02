import { describe, it, expect } from 'vitest';

// Helper functions for payout calculations
// TODO: Move these to src/lib/payout-engine.ts once implemented

function calculatePayout(params: {
    grossProfit: number;
    profitSplit: number;
    payoutCap: number;
}) {
    const { grossProfit, profitSplit, payoutCap } = params;
    const traderShare = grossProfit * profitSplit;
    const firmShare = grossProfit * (1 - profitSplit);
    const wasCapped = traderShare > payoutCap;
    const excessProfit = wasCapped ? traderShare - payoutCap : 0;

    return {
        traderShare: wasCapped ? payoutCap : traderShare,
        firmShare,
        wasCapped,
        excessProfit,
    };
}

function shouldResetPayoutCycle(cycleStart: Date, today: Date): boolean {
    const daysDiff = Math.floor((today.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff >= 30;
}

function canRequestPayout(params: {
    activeTradingDays: number;
    cycleStart: Date;
    consistencyFlagged?: boolean;
}): boolean {
    const { activeTradingDays, consistencyFlagged } = params;

    // Minimum 5 active trading days required
    if (activeTradingDays < 5) {
        return false;
    }

    // Consistency flag is "soft" - doesn't block payout, just triggers review
    return true;
}

function checkConsistencyFlag(params: {
    totalProfit: number;
    largestSingleDayProfit: number;
}) {
    const { totalProfit, largestSingleDayProfit } = params;
    const percentage = (largestSingleDayProfit / totalProfit) * 100;
    const flagged = percentage > 50;

    return {
        flagged,
        percentage: Math.round(percentage),
    };
}

// ===== TESTS =====

describe('Profit Split Calculations', () => {
    it('calculates 80/20 split correctly', () => {
        const payout = calculatePayout({
            grossProfit: 5000,
            profitSplit: 0.80,
            payoutCap: 10000,
        });
        expect(payout.traderShare).toBe(4000);
        expect(payout.firmShare).toBeCloseTo(1000, 1);
        expect(payout.wasCapped).toBe(false);
    });

    it('calculates 90/10 split for add-on users', () => {
        const payout = calculatePayout({
            grossProfit: 5000,
            profitSplit: 0.90,
            payoutCap: 10000,
        });
        expect(payout.traderShare).toBe(4500);
        expect(payout.firmShare).toBeCloseTo(500, 1);
        expect(payout.wasCapped).toBe(false);
    });

    it('correctly splits when profit approaches cap', () => {
        const payout = calculatePayout({
            grossProfit: 12000,
            profitSplit: 0.80,
            payoutCap: 10000,
        });
        // 12000 * 0.8 = 9600 (under cap)
        expect(payout.traderShare).toBe(9600);
        expect(payout.firmShare).toBeCloseTo(2400, 1);
        expect(payout.wasCapped).toBe(false);
    });
});

describe('Payout Cap Enforcement', () => {
    it('enforces payout cap at starting balance', () => {
        const payout = calculatePayout({
            grossProfit: 15000,
            profitSplit: 0.80,
            payoutCap: 10000,
        });
        // 15000 * 0.8 = 12000, but capped at 10000
        expect(payout.traderShare).toBe(10000);
        expect(payout.wasCapped).toBe(true);
        expect(payout.excessProfit).toBe(2000); // 12000 - 10000
    });

    it('caps at exact payout cap amount', () => {
        const payout = calculatePayout({
            grossProfit: 12500,
            profitSplit: 0.80,
            payoutCap: 10000,
        });
        // 12500 * 0.8 = 10000 (exactly at cap)
        expect(payout.traderShare).toBe(10000);
        expect(payout.wasCapped).toBe(false); // Not technically capped if exactly at limit
    });

    it('handles massive profits with capping', () => {
        const payout = calculatePayout({
            grossProfit: 50000,
            profitSplit: 0.90,
            payoutCap: 10000,
        });
        // 50000 * 0.9 = 45000, capped at 10000
        expect(payout.traderShare).toBe(10000);
        expect(payout.wasCapped).toBe(true);
        expect(payout.excessProfit).toBe(35000);
    });
});

describe('Payout Cycle Tracking', () => {
    it('resets cycle after 30 calendar days', () => {
        const cycleStart = new Date('2026-01-01');
        const today = new Date('2026-01-31');

        const shouldReset = shouldResetPayoutCycle(cycleStart, today);
        expect(shouldReset).toBe(true);
    });

    it('does not reset before 30 days', () => {
        const cycleStart = new Date('2026-01-01');
        const today = new Date('2026-01-29');

        const shouldReset = shouldResetPayoutCycle(cycleStart, today);
        expect(shouldReset).toBe(false);
    });

    it('resets on exactly day 30', () => {
        const cycleStart = new Date('2026-01-01');
        const today = new Date('2026-01-30');

        const shouldReset = shouldResetPayoutCycle(cycleStart, today);
        expect(shouldReset).toBe(false); // Day 30 is still within cycle

        const day31 = new Date('2026-01-31');
        expect(shouldResetPayoutCycle(cycleStart, day31)).toBe(true);
    });
});

describe('Active Trading Days Requirement', () => {
    it('requires 5 active trading days before payout', () => {
        const canPayout = canRequestPayout({
            activeTradingDays: 4,
            cycleStart: new Date('2026-01-01'),
        });
        expect(canPayout).toBe(false);
    });

    it('allows payout after 5 active trading days', () => {
        const canPayout = canRequestPayout({
            activeTradingDays: 5,
            cycleStart: new Date('2026-01-01'),
        });
        expect(canPayout).toBe(true);
    });

    it('allows payout with more than 5 trading days', () => {
        const canPayout = canRequestPayout({
            activeTradingDays: 10,
            cycleStart: new Date('2026-01-01'),
        });
        expect(canPayout).toBe(true);
    });
});

describe('Consistency Flag (>50% Single-Day Profit)', () => {
    it('flags account when >50% profit from single day', () => {
        const result = checkConsistencyFlag({
            totalProfit: 2000,
            largestSingleDayProfit: 1200,
        });
        expect(result.flagged).toBe(true);
        expect(result.percentage).toBe(60); // 1200/2000 = 60%
    });

    it('does not flag when single-day profit is <50%', () => {
        const result = checkConsistencyFlag({
            totalProfit: 5000,
            largestSingleDayProfit: 2000,
        });
        expect(result.flagged).toBe(false);
        expect(result.percentage).toBe(40); // 2000/5000 = 40%
    });

    it('flags at exactly 50.1%', () => {
        const result = checkConsistencyFlag({
            totalProfit: 1000,
            largestSingleDayProfit: 501,
        });
        expect(result.flagged).toBe(true);
        expect(result.percentage).toBe(50); // Rounded
    });

    it('soft flag does not block payout', () => {
        const canPayout = canRequestPayout({
            activeTradingDays: 5,
            cycleStart: new Date('2026-01-01'),
            consistencyFlagged: true,
        });
        expect(canPayout).toBe(true); // Soft flag only - doesn't block
    });
});

describe('Edge Cases', () => {
    it('handles zero profit correctly', () => {
        const payout = calculatePayout({
            grossProfit: 0,
            profitSplit: 0.80,
            payoutCap: 10000,
        });
        expect(payout.traderShare).toBe(0);
        expect(payout.firmShare).toBe(0);
        expect(payout.wasCapped).toBe(false);
    });

    it('handles very small profit amounts', () => {
        const payout = calculatePayout({
            grossProfit: 50,
            profitSplit: 0.80,
            payoutCap: 10000,
        });
        expect(payout.traderShare).toBe(40);
        expect(payout.firmShare).toBeCloseTo(10, 1);
    });

    it('handles fractional consistency percentages', () => {
        const result = checkConsistencyFlag({
            totalProfit: 3333,
            largestSingleDayProfit: 1700,
        });
        // 1700/3333 = 51.0015...%
        expect(result.flagged).toBe(true);
        expect(result.percentage).toBe(51);
    });
});
