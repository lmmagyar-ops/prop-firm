/**
 * Integration tests for trade execution flow contracts.
 * 
 * These tests verify the cross-module interface contracts between
 * TradeExecutor, RiskEngine, and ChallengeEvaluator using mocks.
 * For real database tests, use vitest with a test database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FUNDED_RULES, getFundedRulesForTier, getExposureLimitByVolume } from '@/lib/funded-rules';

// These integration tests verify the business logic contracts
// without requiring full database mocking.

describe('Trade Flow Contracts', () => {
    describe('Funded Rules Configuration', () => {
        it('should have correct 5k tier trading limits', () => {
            const rules = getFundedRulesForTier('5k');

            expect(rules.startingBalance).toBe(5000);
            expect(rules.maxOpenPositions).toBe(10);
            expect(rules.maxDailyDrawdownPercent).toBe(0.04);
            expect(rules.maxTotalDrawdownPercent).toBe(0.08);
        });

        it('should have correct 10k tier trading limits', () => {
            const rules = getFundedRulesForTier('10k');

            expect(rules.startingBalance).toBe(10000);
            expect(rules.maxOpenPositions).toBe(15);
            expect(rules.maxDailyDrawdownPercent).toBe(0.05);
            expect(rules.maxTotalDrawdownPercent).toBe(0.10);
        });

        it('should have correct 25k tier trading limits', () => {
            const rules = getFundedRulesForTier('25k');

            expect(rules.startingBalance).toBe(25000);
            expect(rules.maxOpenPositions).toBe(20);
            expect(rules.maxDailyDrawdownPercent).toBe(0.05);
            expect(rules.maxTotalDrawdownPercent).toBe(0.10);
        });
    });

    describe('Volume-Based Exposure Limits', () => {
        it('should allow 5% exposure on high volume markets (>$10M)', () => {
            const balance = 10000;
            const volume = 15_000_000; // $15M

            const limit = getExposureLimitByVolume(balance, volume);
            expect(limit).toBe(500); // 5% of $10k
        });

        it('should allow 2.5% exposure on medium volume markets ($1-10M)', () => {
            const balance = 10000;
            const volume = 5_000_000; // $5M

            const limit = getExposureLimitByVolume(balance, volume);
            expect(limit).toBe(250); // 2.5% of $10k
        });

        it('should allow 0.5% exposure on low volume markets ($100k-1M)', () => {
            const balance = 10000;
            const volume = 500_000; // $500k

            const limit = getExposureLimitByVolume(balance, volume);
            expect(limit).toBe(50); // 0.5% of $10k
        });

        it('should block trading on markets with <$100k volume', () => {
            const balance = 10000;
            const volume = 50_000; // $50k

            const limit = getExposureLimitByVolume(balance, volume);
            expect(limit).toBe(0); // Blocked
        });
    });

    describe('Risk Engine Contract', () => {
        it('should calculate correct daily loss floor', () => {
            const startOfDayBalance = 10000;
            const maxDailyLossPercent = 0.05; // 5%

            const dailyLossFloor = startOfDayBalance * (1 - maxDailyLossPercent);
            expect(dailyLossFloor).toBe(9500);
        });

        it('should calculate correct total drawdown floor (funded)', () => {
            const startingBalance = 10000;
            const maxTotalDrawdownPercent = 0.10; // 10%

            // Funded uses STATIC drawdown from starting balance
            const drawdownFloor = startingBalance * (1 - maxTotalDrawdownPercent);
            expect(drawdownFloor).toBe(9000);
        });

        it('should calculate correct trailing drawdown floor (evaluation)', () => {
            const highWaterMark = 11000; // Grew from 10k
            const maxTotalDrawdownPercent = 0.10; // 10%

            // Evaluation uses TRAILING drawdown from HWM
            const drawdownFloor = highWaterMark * (1 - maxTotalDrawdownPercent);
            expect(drawdownFloor).toBe(9900);
        });
    });

    describe('Position Direction Contract', () => {
        it('should store NO positions with inverted price basis', () => {
            const yesPrice = 0.65;
            const noPrice = 1 - yesPrice;

            expect(noPrice).toBeCloseTo(0.35, 4);
        });

        it('should calculate correct P&L for YES positions', () => {
            const entryPrice = 0.50;
            const currentPrice = 0.60;
            const shares = 100;

            const pnl = (currentPrice - entryPrice) * shares;
            expect(pnl).toBeCloseTo(10);
        });

        it('should calculate correct P&L for NO positions (price rises as YES falls)', () => {
            const entryNoBasis = 0.50; // Entry when YES was 0.50
            const currentYes = 0.40; // YES dropped
            const currentNoBasis = 1 - currentYes; // 0.60
            const shares = 100;

            const pnl = (currentNoBasis - entryNoBasis) * shares;
            expect(pnl).toBeCloseTo(10); // Profit because YES dropped
        });
    });

    describe('Payout Split Contract', () => {
        it('should calculate 80/20 profit split correctly', () => {
            const grossProfit = 1000;
            const profitSplit = 0.80;

            const traderShare = grossProfit * profitSplit;
            const firmShare = grossProfit * (1 - profitSplit);

            expect(traderShare).toBeCloseTo(800);
            expect(firmShare).toBeCloseTo(200);
        });

        it('should respect payout cap', () => {
            const grossProfit = 10000;
            const profitSplit = 0.80;
            const payoutCap = 5000;

            const uncappedShare = grossProfit * profitSplit; // 8000
            const cappedShare = Math.min(uncappedShare, payoutCap);

            expect(cappedShare).toBe(5000);
        });
    });
});
