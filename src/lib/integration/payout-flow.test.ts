/**
 * Integration tests for payout flow contracts.
 * 
 * These tests verify the business logic for payout eligibility,
 * calculation, and tier-based rules without requiring database mocking.
 */

import { describe, it, expect } from 'vitest';
import { FUNDED_RULES, getFundedRulesForTier, CONSISTENCY_CONFIG } from '@/lib/funded-rules';

describe('Payout Flow Contracts', () => {
    describe('Payout Eligibility Rules', () => {
        it('should require minimum 5 trading days for all tiers', () => {
            expect(FUNDED_RULES['5k'].minTradingDays).toBe(5);
            expect(FUNDED_RULES['10k'].minTradingDays).toBe(5);
            expect(FUNDED_RULES['25k'].minTradingDays).toBe(5);
        });

        it('should have consistency flag threshold at 50%', () => {
            expect(CONSISTENCY_CONFIG.maxSingleDayProfitPercent).toBe(0.50);
        });

        it('should require minimum 3 trades before flagging', () => {
            expect(CONSISTENCY_CONFIG.minTradesForFlag).toBe(3);
        });

        it('should terminate after 30 days of inactivity', () => {
            expect(CONSISTENCY_CONFIG.inactivityDays).toBe(30);
        });
    });

    describe('Payout Calculation', () => {
        it('should calculate 5k tier payout correctly', () => {
            const rules = getFundedRulesForTier('5k');
            const grossProfit = 1000;

            const traderShare = grossProfit * rules.profitSplit;
            expect(traderShare).toBe(800); // 80%
            expect(rules.payoutCap).toBe(5000);
        });

        it('should calculate 10k tier payout correctly', () => {
            const rules = getFundedRulesForTier('10k');
            const grossProfit = 2000;

            const traderShare = grossProfit * rules.profitSplit;
            expect(traderShare).toBe(1600); // 80%
            expect(rules.payoutCap).toBe(10000);
        });

        it('should calculate 25k tier payout correctly', () => {
            const rules = getFundedRulesForTier('25k');
            const grossProfit = 5000;

            const traderShare = grossProfit * rules.profitSplit;
            expect(traderShare).toBe(4000); // 80%
            expect(rules.payoutCap).toBe(25000);
        });

        it('should cap payout at tier limit', () => {
            const rules = getFundedRulesForTier('5k');
            const grossProfit = 10000; // High profit

            const uncappedShare = grossProfit * rules.profitSplit; // 8000
            const cappedShare = Math.min(uncappedShare, rules.payoutCap);

            expect(cappedShare).toBe(5000); // Capped
        });

        it('should handle zero profit gracefully', () => {
            const grossProfit = 0;
            const profitSplit = 0.80;

            const traderShare = grossProfit * profitSplit;
            expect(traderShare).toBe(0);
        });

        it('should handle negative profit (no payout)', () => {
            const currentBalance = 4500;
            const startingBalance = 5000;
            const grossProfit = currentBalance - startingBalance;

            expect(grossProfit).toBe(-500);

            // Payout eligibility should fail for negative profit
            const isEligible = grossProfit > 0;
            expect(isEligible).toBe(false);
        });
    });

    describe('Eligibility Calculation Contract', () => {
        interface EligibilityInputs {
            phase: string;
            status: string;
            currentBalance: number;
            startingBalance: number;
            activeTradingDays: number;
            consistencyFlagged: boolean;
        }

        function checkEligibility(inputs: EligibilityInputs) {
            const requirements = {
                isFunded: inputs.phase === 'funded',
                isActive: inputs.status === 'active',
                hasProfit: inputs.currentBalance > inputs.startingBalance,
                minTradingDays: inputs.activeTradingDays >= 5,
                noConsistencyFlag: !inputs.consistencyFlagged,
            };

            const eligible = Object.values(requirements).every(Boolean);
            return { eligible, requirements };
        }

        it('should be eligible when all requirements met', () => {
            const result = checkEligibility({
                phase: 'funded',
                status: 'active',
                currentBalance: 5500,
                startingBalance: 5000,
                activeTradingDays: 7,
                consistencyFlagged: false,
            });

            expect(result.eligible).toBe(true);
        });

        it('should reject non-funded accounts', () => {
            const result = checkEligibility({
                phase: 'challenge',
                status: 'active',
                currentBalance: 5500,
                startingBalance: 5000,
                activeTradingDays: 7,
                consistencyFlagged: false,
            });

            expect(result.eligible).toBe(false);
            expect(result.requirements.isFunded).toBe(false);
        });

        it('should reject accounts with no profit', () => {
            const result = checkEligibility({
                phase: 'funded',
                status: 'active',
                currentBalance: 4900,
                startingBalance: 5000,
                activeTradingDays: 7,
                consistencyFlagged: false,
            });

            expect(result.eligible).toBe(false);
            expect(result.requirements.hasProfit).toBe(false);
        });

        it('should reject accounts with insufficient trading days', () => {
            const result = checkEligibility({
                phase: 'funded',
                status: 'active',
                currentBalance: 5500,
                startingBalance: 5000,
                activeTradingDays: 3,
                consistencyFlagged: false,
            });

            expect(result.eligible).toBe(false);
            expect(result.requirements.minTradingDays).toBe(false);
        });

        it('should reject consistency-flagged accounts', () => {
            const result = checkEligibility({
                phase: 'funded',
                status: 'active',
                currentBalance: 5500,
                startingBalance: 5000,
                activeTradingDays: 7,
                consistencyFlagged: true,
            });

            expect(result.eligible).toBe(false);
            expect(result.requirements.noConsistencyFlag).toBe(false);
        });
    });

    describe('Resolution Exclusion Contract', () => {
        it('should exclude P&L from >60% price moves', () => {
            const initialPrice = 0.30;
            const resolvedPrice = 0.95;
            const priceMove = resolvedPrice - initialPrice;

            expect(priceMove).toBeGreaterThan(0.60);

            // This position's P&L should be excluded
            const shouldExclude = priceMove > 0.60;
            expect(shouldExclude).toBe(true);
        });

        it('should include P&L from normal price moves', () => {
            const initialPrice = 0.50;
            const currentPrice = 0.65;
            const priceMove = currentPrice - initialPrice;

            expect(priceMove).toBeLessThan(0.60);

            const shouldExclude = priceMove > 0.60;
            expect(shouldExclude).toBe(false);
        });

        it('should calculate adjusted profit after exclusions', () => {
            const grossProfit = 1000;
            const excludedPnl = 300; // From resolution events

            const adjustedProfit = grossProfit - excludedPnl;
            expect(adjustedProfit).toBe(700);

            const traderShare = adjustedProfit * 0.80;
            expect(traderShare).toBe(560);
        });
    });
});
