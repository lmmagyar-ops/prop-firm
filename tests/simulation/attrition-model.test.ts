import { describe, it, expect } from 'vitest';
import {
    calculateRealWorldProjection,
    generateAttritionReport,
    compareModels,
    runSensitivityAnalysis,
    type AttritionConfig
} from '@/lib/simulation/attrition-model';
import { FIRM_CONFIG } from '@/lib/simulation/config';

describe('Real-World Attrition Model (Option D)', () => {
    // Base config from cofounder's data
    const REAL_WORLD_CONFIG: AttritionConfig = {
        evalMultiplier: 2.0,              // 2x evals per trader (conservative)
        evaluationPassRate: 0.08,         // 8% pass evaluation
        fundedToPayoutRate: 0.03,         // 3% get first payout (50% attrition)
        firstPayoutCapPercent: 0.10,      // 10% cap on first payout
        ongoingAttritionRate: 0.50,       // 50% blow up after first payout
    };

    describe('Baseline Projection (1,000 traders)', () => {
        it('should show profitability with 2x eval multiplier', () => {
            const projection = calculateRealWorldProjection(1000, FIRM_CONFIG, REAL_WORLD_CONFIG);

            console.log('\n💰 REAL-WORLD MODEL (1,000 traders):');
            console.log(`Total evals: ${projection.totalEvals.toLocaleString()}`);
            console.log(`Revenue: $${projection.revenue.totalRevenue.toLocaleString()}`);
            console.log(`First payouts: ${projection.funnel.firstPayouts}`);
            console.log(`Total payout liability: $${Math.round(projection.payouts.totalPayoutLiability).toLocaleString()}`);
            console.log(`NET CASH FLOW: $${Math.round(projection.cashFlow.netCashFlow).toLocaleString()}`);
            console.log(`Profit margin: ${projection.cashFlow.profitMargin.toFixed(1)}%`);

            // Should be profitable!
            expect(projection.cashFlow.netCashFlow).toBeGreaterThan(0);
            expect(projection.cashFlow.profitMargin).toBeGreaterThan(30); // At least 30% margin
        });
    });

    describe('Funnel Validation', () => {
        it('should correctly model attrition funnel', () => {
            const projection = calculateRealWorldProjection(1000, FIRM_CONFIG, REAL_WORLD_CONFIG);

            // 2000 eval attempts
            expect(projection.totalEvals).toBe(2000);

            // 8% pass = 160 funded
            expect(projection.funnel.evaluationPasses).toBe(160);

            // 3% get first payout = 60 traders
            expect(projection.funnel.firstPayouts).toBe(60);

            console.log('\n📊 ATTRITION FUNNEL:');
            console.log(`2000 attempts → ${projection.funnel.evaluationPasses} pass (8%) → ${projection.funnel.firstPayouts} payout (3%)`);
            console.log(`Funded attrition: ${((1 - (projection.funnel.firstPayouts / projection.funnel.evaluationPasses)) * 100).toFixed(0)}%`);
        });
    });

    describe('First Payout Cap', () => {
        it('should cap first payout at 10% ($1,000)', () => {
            const projection = calculateRealWorldProjection(1000, FIRM_CONFIG, REAL_WORLD_CONFIG);

            // 10% of $10,000 = $1,000
            const expectedCap = 10000 * 0.10;
            // Trader gets 80% of that = $800
            const expectedTraderShare = expectedCap * 0.80;

            expect(projection.payouts.avgFirstPayout).toBe(expectedTraderShare);

            console.log('\n💸 FIRST PAYOUT CAP:');
            console.log(`Capped at: $${expectedCap.toLocaleString()} (10% of balance)`);
            console.log(`Trader gets: $${expectedTraderShare.toLocaleString()} (80% split)`);
            console.log(`Total first payouts: $${projection.payouts.firstPayoutTotal.toLocaleString()}`);
        });
    });

    describe('Model Comparison', () => {
        it('should show massive improvement vs original simulation', () => {
            const projection = calculateRealWorldProjection(1000, FIRM_CONFIG, REAL_WORLD_CONFIG);

            // Original simulation showed -$99,000 loss
            const originalNet = -99000;

            const comparison = compareModels(originalNet, projection);

            console.log('\n' + comparison);

            // Real-world model should be WAY better
            expect(projection.cashFlow.netCashFlow).toBeGreaterThan(originalNet + 100000); // At least $100k better
        });
    });

    describe('Sensitivity Analysis', () => {
        it('should test different eval multipliers (1x to 3.5x)', () => {
            const results = runSensitivityAnalysis(FIRM_CONFIG, REAL_WORLD_CONFIG);

            console.log('\n📈 SENSITIVITY ANALYSIS (Eval Multiplier):');
            console.log('Multiplier | Net Cash Flow | Profit Margin');
            console.log('-----------|---------------|---------------');

            results.forEach(r => {
                const status = r.netCashFlow > 0 ? '✅' : '❌';
                console.log(`${r.multiplier.toFixed(2)}x      | $${Math.round(r.netCashFlow).toLocaleString().padStart(12)} | ${r.profitMargin.toFixed(1)}% ${status}`);
            });

            // Find break-even point
            const breakEvenMultiplier = results.find(r => r.netCashFlow >= 0)?.multiplier || 0;
            console.log(`\n💡 Break-even multiplier: ${breakEvenMultiplier.toFixed(2)}x`);

            expect(results).toHaveLength(11); // 1.0 to 3.5 in 0.25 increments
        });
    });

    describe('Full Report Generation', () => {
        it('should generate comprehensive attrition report', () => {
            const projection = calculateRealWorldProjection(1000, FIRM_CONFIG, REAL_WORLD_CONFIG);
            const report = generateAttritionReport(projection);

            expect(report).toContain('REAL-WORLD ATTRITION MODEL');
            expect(report).toContain('ATTRITION FUNNEL');
            expect(report).toContain('CASH FLOW');

            console.log('\n' + report);
        });
    });

    describe('Conservative vs Aggressive Scenarios', () => {
        it('should compare 1.5x vs 3x eval multipliers', () => {
            const conservative = calculateRealWorldProjection(1000, FIRM_CONFIG, {
                ...REAL_WORLD_CONFIG,
                evalMultiplier: 1.5,
            });

            const aggressive = calculateRealWorldProjection(1000, FIRM_CONFIG, {
                ...REAL_WORLD_CONFIG,
                evalMultiplier: 3.0,
            });

            console.log('\n🎯 SCENARIO COMPARISON:');
            console.log('\nCONSERVATIVE (1.5x):');
            console.log(`Revenue: $${conservative.revenue.totalRevenue.toLocaleString()}`);
            console.log(`Net: $${Math.round(conservative.cashFlow.netCashFlow).toLocaleString()}`);
            console.log(`Margin: ${conservative.cashFlow.profitMargin.toFixed(1)}%`);

            console.log('\nAGGRESSIVE (3x):');
            console.log(`Revenue: $${aggressive.revenue.totalRevenue.toLocaleString()}`);
            console.log(`Net: $${Math.round(aggressive.cashFlow.netCashFlow).toLocaleString()}`);
            console.log(`Margin: ${aggressive.cashFlow.profitMargin.toFixed(1)}%`);

            // Both should be profitable
            expect(conservative.cashFlow.netCashFlow).toBeGreaterThan(0);
            expect(aggressive.cashFlow.netCashFlow).toBeGreaterThan(0);

            // Aggressive should be 2x better
            expect(aggressive.cashFlow.netCashFlow).toBeGreaterThan(conservative.cashFlow.netCashFlow * 1.5);
        });
    });
});
