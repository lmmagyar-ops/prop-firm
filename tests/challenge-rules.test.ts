import { describe, it, expect } from 'vitest';

// Helper functions for challenge risk calculations
// TODO: Move these to src/lib/challenge-engine.ts once implemented

function calculateDrawdown(params: {
    startingBalance: number;
    highWaterMark: number;
    currentBalance: number;
}) {
    const { startingBalance, highWaterMark, currentBalance } = params;
    const referenceBalance = Math.max(highWaterMark, startingBalance);
    const drawdown = referenceBalance - currentBalance;
    const drawdownPercent = (drawdown / referenceBalance) * 100;

    const MAX_DRAWDOWN = 8; // 8%
    const exceeded = drawdownPercent > MAX_DRAWDOWN;

    return {
        drawdownPercent: Number(drawdownPercent.toFixed(2)),
        exceeded,
        shouldFail: exceeded,
    };
}

function checkDailyLoss(params: {
    startOfDayBalance: number;
    currentBalance: number;
}) {
    const { startOfDayBalance, currentBalance } = params;
    const loss = startOfDayBalance - currentBalance;
    const lossPercent = (loss / startOfDayBalance) * 100;

    const DAILY_LOSS_LIMIT = 4; // 4%
    const exceeded = lossPercent > DAILY_LOSS_LIMIT;

    return {
        lossPercent: Number(lossPercent.toFixed(2)),
        exceeded,
        shouldFail: exceeded,
    };
}

function checkProfitTarget(params: {
    startingBalance: number;
    currentBalance: number;
    targetPercent: number;
}) {
    const { startingBalance, currentBalance, targetPercent } = params;
    const profit = currentBalance - startingBalance;
    const profitPercent = (profit / startingBalance) * 100;

    return {
        targetReached: profitPercent >= targetPercent,
        profit,
        profitPercent: Number(profitPercent.toFixed(2)),
    };
}

function canAdvancePhase(challenge: {
    phase: string;
    startingBalance: number;
    currentBalance: number;
}) {
    const profitTarget = challenge.phase === 'challenge' ? 8 : 5;
    const result = checkProfitTarget({
        startingBalance: challenge.startingBalance,
        currentBalance: challenge.currentBalance,
        targetPercent: profitTarget,
    });
    return result.targetReached;
}

function determineNextPhase(params: {
    currentPhase: string;
    profitAchieved: number;
    startingBalance: number;
    maxDrawdownExceeded?: boolean;
}) {
    const { currentPhase, profitAchieved, startingBalance, maxDrawdownExceeded } = params;

    if (maxDrawdownExceeded) {
        return 'failed';
    }

    const profitPercent = (profitAchieved / startingBalance) * 100;

    if (currentPhase === 'challenge' && profitPercent >= 8) {
        return 'verification';
    }

    if (currentPhase === 'verification' && profitPercent >= 5) {
        return 'funded';
    }

    return currentPhase;
}

// ===== TESTS =====

describe('Max Drawdown Calculation', () => {
    it('correctly calculates drawdown from high water mark', () => {
        const result = calculateDrawdown({
            startingBalance: 10000,
            highWaterMark: 11500,
            currentBalance: 10580,
        });
        // Drawdown = (11500 - 10580) / 11500 = 8%
        expect(result.drawdownPercent).toBe(8.0);
    });

    it('fails challenge when max drawdown exceeded (8%)', () => {
        const result = calculateDrawdown({
            startingBalance: 10000,
            highWaterMark: 11000,
            currentBalance: 10120,
        });
        // Drawdown = (11000 - 10120) / 11000 = 8%
        expect(result.exceeded).toBe(false);

        const failedResult = calculateDrawdown({
            startingBalance: 10000,
            highWaterMark: 11000,
            currentBalance: 10100,
        });
        // Drawdown = (11000 - 10100) / 11000 = 8.18%
        expect(failedResult.exceeded).toBe(true);
        expect(failedResult.shouldFail).toBe(true);
    });

    it('uses starting balance if no profit made yet', () => {
        const result = calculateDrawdown({
            startingBalance: 10000,
            highWaterMark: 10000,
            currentBalance: 9300,
        });
        // Drawdown = (10000 - 9300) / 10000 = 7%
        expect(result.drawdownPercent).toBe(7.0);
        expect(result.exceeded).toBe(false);
    });

    it('correctly identifies exact 8% drawdown as not exceeded', () => {
        const result = calculateDrawdown({
            startingBalance: 10000,
            highWaterMark: 11000,
            currentBalance: 10120,
        });
        // Exactly 8% drawdown
        expect(result.drawdownPercent).toBe(8.0);
        expect(result.exceeded).toBe(false); // Should NOT exceed at exactly 8%
    });
});

describe('Daily Loss Limit (4%)', () => {
    it('tracks daily loss from start-of-day snapshot', () => {
        const result = checkDailyLoss({
            startOfDayBalance: 10500,
            currentBalance: 10080,
        });
        // Loss = (10500 - 10080) / 10500 = 4%
        expect(result.lossPercent).toBe(4.0);
        expect(result.exceeded).toBe(false);
    });

    it('fails challenge when daily loss exceeds 4%', () => {
        const result = checkDailyLoss({
            startOfDayBalance: 10000,
            currentBalance: 9590,
        });
        // Loss = (10000 - 9590) / 10000 = 4.1%
        expect(result.lossPercent).toBe(4.1);
        expect(result.exceeded).toBe(true);
        expect(result.shouldFail).toBe(true);
    });

    it('correctly handles exactly 4% daily loss', () => {
        const result = checkDailyLoss({
            startOfDayBalance: 10000,
            currentBalance: 9600,
        });
        // Exactly 4% loss
        expect(result.lossPercent).toBe(4.0);
        expect(result.exceeded).toBe(false); // Should NOT exceed at exactly 4%
    });

    it('handles profitable days (no loss)', () => {
        const result = checkDailyLoss({
            startOfDayBalance: 10000,
            currentBalance: 10500,
        });
        // Negative loss = profit
        expect(result.lossPercent).toBe(-5.0);
        expect(result.exceeded).toBe(false);
    });
});

describe('Profit Target (8% for Challenge, 5% for Verification)', () => {
    it('detects when 8% profit target is reached', () => {
        const result = checkProfitTarget({
            startingBalance: 10000,
            currentBalance: 10800,
            targetPercent: 8,
        });
        expect(result.targetReached).toBe(true);
        expect(result.profit).toBe(800);
        expect(result.profitPercent).toBe(8.0);
    });

    it('detects when 5% profit target is reached (verification)', () => {
        const result = checkProfitTarget({
            startingBalance: 10000,
            currentBalance: 10500,
            targetPercent: 5,
        });
        expect(result.targetReached).toBe(true);
        expect(result.profit).toBe(500);
    });

    it('identifies when profit target is not yet reached', () => {
        const result = checkProfitTarget({
            startingBalance: 10000,
            currentBalance: 10700,
            targetPercent: 8,
        });
        expect(result.targetReached).toBe(false);
        expect(result.profitPercent).toBe(7.0);
    });

    it('allows phase advancement when target met', () => {
        const challenge = {
            phase: 'challenge',
            startingBalance: 10000,
            currentBalance: 10850,
        };

        const canAdvance = canAdvancePhase(challenge);
        expect(canAdvance).toBe(true);
    });
});

describe('Phase Progression (Challenge → Verification → Funded)', () => {
    it('advances from challenge to verification when 8% profit reached', () => {
        const nextPhase = determineNextPhase({
            currentPhase: 'challenge',
            profitAchieved: 850,
            startingBalance: 10000,
        });
        expect(nextPhase).toBe('verification');
    });

    it('advances from verification to funded when 5% profit reached', () => {
        const nextPhase = determineNextPhase({
            currentPhase: 'verification',
            profitAchieved: 525,
            startingBalance: 10000,
        });
        expect(nextPhase).toBe('funded');
    });

    it('does not advance if risk rules violated', () => {
        const nextPhase = determineNextPhase({
            currentPhase: 'challenge',
            profitAchieved: 850,
            startingBalance: 10000,
            maxDrawdownExceeded: true,
        });
        expect(nextPhase).toBe('failed');
    });

    it('stays in current phase if profit target not met', () => {
        const nextPhase = determineNextPhase({
            currentPhase: 'challenge',
            profitAchieved: 700, // Only 7%
            startingBalance: 10000,
        });
        expect(nextPhase).toBe('challenge');
    });
});
