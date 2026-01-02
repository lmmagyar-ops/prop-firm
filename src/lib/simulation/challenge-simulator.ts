/**
 * Challenge Lifecycle Simulator
 * 
 * Simulates the full challenge process from start to finish,
 * checking for violations and determining pass/fail outcomes.
 */

import { Trader, decideTrade, generateTrade, executeTrade, calculateDrawdown, calculateDailyLossPercent } from './trader-behavior';
import { FIRM_CONFIG } from './config';

export type ChallengeOutcome = 'PASS' | 'FAIL_DRAWDOWN' | 'FAIL_DAILY_LOSS' | 'FAIL_TIMEOUT' | 'IN_PROGRESS';

export interface ChallengeResult {
    outcome: ChallengeOutcome;
    passedOnDay?: number;
    finalBalance: number;
    totalTrades: number;
    tradingDays: number;
    maxDrawdown: number;
    returnPercent: number;
    violations: string[];
}

/**
 * Run a full challenge simulation for a trader over N days
 */
export function runChallenge(trader: Trader, maxDays: number = FIRM_CONFIG.maxChallengeDays): ChallengeResult {
    let currentDay = 0;

    while (currentDay < maxDays && trader.isActive) {
        const dayDate = new Date();
        dayDate.setDate(dayDate.getDate() + currentDay);

        // Trader decides how many trades to make today
        let tradesThisDay = 0;
        while (decideTrade(trader, currentDay)) {
            const tradeId = `${trader.id}-trade-${trader.trades.length + 1}`;
            const trade = generateTrade(trader, tradeId, currentDay);
            executeTrade(trader, trade);
            tradesThisDay++;

            // Check violations after each trade
            const violation = checkViolations(trader, dayDate);
            if (violation) {
                trader.isActive = false;
                trader.violations.push(violation);
                break;
            }

            // Check if hit profit target (PASS)
            const profitPercent = (trader.balance - trader.startingBalance) / trader.startingBalance;
            if (profitPercent >= FIRM_CONFIG.profitTargetPercent) {
                return {
                    outcome: 'PASS',
                    passedOnDay: currentDay + 1,
                    finalBalance: trader.balance,
                    totalTrades: trader.trades.length,
                    tradingDays: trader.tradingDays.size,
                    maxDrawdown: calculateDrawdown(trader),
                    returnPercent: profitPercent * 100,
                    violations: trader.violations,
                };
            }
        }

        currentDay++;
    }

    // Determine final outcome
    const profitPercent = (trader.balance - trader.startingBalance) / trader.startingBalance;

    let outcome: ChallengeOutcome;
    if (trader.violations.length > 0) {
        if (trader.violations.some(v => v.includes('drawdown'))) {
            outcome = 'FAIL_DRAWDOWN';
        } else if (trader.violations.some(v => v.includes('daily loss'))) {
            outcome = 'FAIL_DAILY_LOSS';
        } else {
            outcome = 'FAIL_TIMEOUT';
        }
    } else if (profitPercent >= FIRM_CONFIG.profitTargetPercent) {
        outcome = 'PASS';
    } else {
        outcome = 'FAIL_TIMEOUT';
    }

    return {
        outcome,
        finalBalance: trader.balance,
        totalTrades: trader.trades.length,
        tradingDays: trader.tradingDays.size,
        maxDrawdown: calculateDrawdown(trader),
        returnPercent: profitPercent * 100,
        violations: trader.violations,
    };
}

/**
 * Check for rule violations
 * Returns violation message if found, null otherwise
 */
export function checkViolations(trader: Trader, currentDay: Date): string | null {
    // Check max drawdown
    const currentDrawdown = calculateDrawdown(trader);
    if (currentDrawdown > FIRM_CONFIG.maxDrawdownPercent) {
        return `Max drawdown exceeded: ${(currentDrawdown * 100).toFixed(2)}% (limit: ${FIRM_CONFIG.maxDrawdownPercent * 100}%)`;
    }

    // Check daily loss limit
    const dailyLossPercent = calculateDailyLossPercent(trader, currentDay);
    if (dailyLossPercent > FIRM_CONFIG.dailyLossLimitPercent) {
        return `Daily loss limit exceeded: ${(dailyLossPercent * 100).toFixed(2)}% (limit: ${FIRM_CONFIG.dailyLossLimitPercent * 100}%)`;
    }

    return null;
}

/**
 * Check if trader meets minimum trading days requirement
 */
export function meetsMinimumTradingDays(trader: Trader): boolean {
    return trader.tradingDays.size >= FIRM_CONFIG.minTradingDays;
}

/**
 * Calculate  profit for funded traders (for payout simulation)
 */
export function calculateMonthlyProfit(trader: Trader, fundedBalance: number): number {
    // Assume funded trader continues with same skill level
    // Simulate 30 days of funded trading
    const monthlyTrades = trader.archetype.avgTradesPerDay * 30;
    const avgTradeReturn = trader.archetype.winRate * 0.1 - (1 - trader.archetype.winRate) * 0.08;

    // Conservative estimate (assume smaller position sizes)
    const estimatedReturn = avgTradeReturn * monthlyTrades * 0.5;
    const monthlyProfit = fundedBalance * estimatedReturn;

    // Apply payout cap
    const maxPayout = fundedBalance * (FIRM_CONFIG.payoutCap - 1); // Cap is 2x, so max profit is 1x
    return Math.min(monthlyProfit, maxPayout);
}

/**
 * Batch simulate multiple challenges
 */
export function simulateMultipleChallenges(traders: Trader[], maxDays: number = FIRM_CONFIG.maxChallengeDays): ChallengeResult[] {
    return traders.map(trader => runChallenge(trader, maxDays));
}

/**
 * Get challenge statistics from results
 */
export function getChallengeStats(results: ChallengeResult[]) {
    const total = results.length;
    const passed = results.filter(r => r.outcome === 'PASS').length;
    const failedDrawdown = results.filter(r => r.outcome === 'FAIL_DRAWDOWN').length;
    const failedDailyLoss = results.filter(r => r.outcome === 'FAIL_DAILY_LOSS').length;
    const failedTimeout = results.filter(r => r.outcome === 'FAIL_TIMEOUT').length;

    const passRate = (passed / total) * 100;
    const avgTrades = results.reduce((sum, r) => sum + r.totalTrades, 0) / total;
    const avgDays = results.reduce((sum, r) => sum + r.tradingDays, 0) / total;

    const passedTraders = results.filter(r => r.outcome === 'PASS');
    const avgReturnForPassed = passedTraders.length > 0
        ? passedTraders.reduce((sum, r) => sum + r.returnPercent, 0) / passedTraders.length
        : 0;

    return {
        total,
        passed,
        failedDrawdown,
        failedDailyLoss,
        failedTimeout,
        passRate,
        avgTrades,
        avgDays,
        avgReturnForPassed,
    };
}
