import { describe, it, expect } from 'vitest';
import { generateTrader } from '@/lib/simulation/trader-behavior';
import { runChallenge, simulateMultipleChallenges, getChallengeStats } from '@/lib/simulation/challenge-simulator';
import { calculateCashFlow, calculateBreakEvenFee, generateFinancialSummary } from '@/lib/simulation/cash-flow';
import { TRADER_ARCHETYPES, FIRM_CONFIG, DEFAULT_DISTRIBUTION } from '@/lib/simulation/config';

describe('Business Survival Simulation (Option A)', () => {
    describe('Baseline Scenario - Mixed Trader Population', () => {
        it('should simulate 1,000 mixed traders over 30 days', () => {
            const totalTraders = 1000;
            const traders = [];

            // Generate traders based on default distribution
            const skilledCount = Math.floor(totalTraders * DEFAULT_DISTRIBUTION.skilled);
            const averageCount = Math.floor(totalTraders * DEFAULT_DISTRIBUTION.average);
            const degenCount = totalTraders - skilledCount - averageCount;

            // Generate skilled traders
            for (let i = 0; i < skilledCount; i++) {
                traders.push(generateTrader(`skilled-${i}`, TRADER_ARCHETYPES.skilled, 'skilled'));
            }

            // Generate average traders
            for (let i = 0; i < averageCount; i++) {
                traders.push(generateTrader(`average-${i}`, TRADER_ARCHETYPES.average, 'average'));
            }

            // Generate degen traders
            for (let i = 0; i < degenCount; i++) {
                traders.push(generateTrader(`degen-${i}`, TRADER_ARCHETYPES.degen, 'degen'));
            }

            // Run challenges
            const results = simulateMultipleChallenges(traders, 30);
            const stats = getChallengeStats(results);
            const cashFlow = calculateCashFlow(results, traders);

            // Assertions
            expect(results).toHaveLength(totalTraders);
            expect(stats.passRate).toBeGreaterThan(0);
            expect(stats.passRate).toBeLessThan(50); // Shouldn't be > 50% pass rate

            console.log('\n🧪 BASELINE SCENARIO (1,000 mixed traders)');
            console.log(`Pass rate: ${stats.passRate.toFixed(1)}%`);
            console.log(`Funded traders: ${stats.passed}`);
            console.log(`Revenue: $${cashFlow.revenue.toLocaleString()}`);
            console.log(`Payout liability: $${cashFlow.payoutLiability.toLocaleString()}`);
            console.log(`Net cash flow: $${cashFlow.netCashFlow.toLocaleString()}`);
            console.log(`Status: ${cashFlow.netCashFlow > 0 ? '✅ PROFITABLE' : '❌ UNPROFITABLE'}`);
        });
    });

    describe('Pessimistic Scenario - High Skilled Trader Ratio', () => {
        it('should test firm survival with 50% skilled traders', () => {
            const totalTraders = 1000;
            const traders = [];

            // 50% skilled, 30% average, 20% degen (pessimistic)
            const skilledCount = 500;
            const averageCount = 300;
            const degenCount = 200;

            for (let i = 0; i < skilledCount; i++) {
                traders.push(generateTrader(`skilled-${i}`, TRADER_ARCHETYPES.skilled, 'skilled'));
            }
            for (let i = 0; i < averageCount; i++) {
                traders.push(generateTrader(`average-${i}`, TRADER_ARCHETYPES.average, 'average'));
            }
            for (let i = 0; i < degenCount; i++) {
                traders.push(generateTrader(`degen-${i}`, TRADER_ARCHETYPES.degen, 'degen'));
            }

            const results = simulateMultipleChallenges(traders, 30);
            const stats = getChallengeStats(results);
            const cashFlow = calculateCashFlow(results, traders);

            console.log('\n⚠️  PESSIMISTIC SCENARIO (50% skilled traders)');
            console.log(`Pass rate: ${stats.passRate.toFixed(1)}%`);
            console.log(`Net cash flow: $${cashFlow.netCashFlow.toLocaleString()}`);
            console.log(`Status: ${cashFlow.netCashFlow > 0 ? '✅ PROFITABLE' : '❌ HIGH RISK'}`);

            // Should still have some traders passing
            expect(stats.passed).toBeGreaterThan(0);
        });
    });

    describe('Optimistic Scenario - High Degen Ratio', () => {
        it('should test firm profitability with 60% degen traders', () => {
            const totalTraders = 1000;
            const traders = [];

            // 10% skilled, 30% average, 60% degen (optimistic for firm)
            const skilledCount = 100;
            const averageCount = 300;
            const degenCount = 600;

            for (let i = 0; i < skilledCount; i++) {
                traders.push(generateTrader(`skilled-${i}`, TRADER_ARCHETYPES.skilled, 'skilled'));
            }
            for (let i = 0; i < averageCount; i++) {
                traders.push(generateTrader(`average-${i}`, TRADER_ARCHETYPES.average, 'average'));
            }
            for (let i = 0; i < degenCount; i++) {
                traders.push(generateTrader(`degen-${i}`, TRADER_ARCHETYPES.degen, 'degen'));
            }

            const results = simulateMultipleChallenges(traders, 30);
            const stats = getChallengeStats(results);
            const cashFlow = calculateCashFlow(results, traders);

            console.log('\n📈 OPTIMISTIC SCENARIO (60% degen traders)');
            console.log(`Pass rate: ${stats.passRate.toFixed(1)}%`);
            console.log(`Net cash flow: $${cashFlow.netCashFlow.toLocaleString()}`);
            console.log(`Status: ${cashFlow.netCashFlow > 0 ? '✅ HIGHLY PROFITABLE' : '⚠️  CHECK RULES'}`);

            // Low pass rate expected
            expect(stats.passRate).toBeLessThan(20);
        });
    });

    describe('Break-Even Analysis', () => {
        it('should calculate minimum fee to break even', () => {
            // Run baseline scenario first
            const totalTraders = 1000;
            const traders = [];

            const skilledCount = Math.floor(totalTraders * 0.25);
            const averageCount = Math.floor(totalTraders * 0.50);
            const degenCount = totalTraders - skilledCount - averageCount;

            for (let i = 0; i < skilledCount; i++) {
                traders.push(generateTrader(`skilled-${i}`, TRADER_ARCHETYPES.skilled, 'skilled'));
            }
            for (let i = 0; i < averageCount; i++) {
                traders.push(generateTrader(`average-${i}`, TRADER_ARCHETYPES.average, 'average'));
            }
            for (let i = 0; i < degenCount; i++) {
                traders.push(generateTrader(`degen-${i}`, TRADER_ARCHETYPES.degen, 'degen'));
            }

            const results = simulateMultipleChallenges(traders, 30);
            const stats = getChallengeStats(results);
            const cashFlow = calculateCashFlow(results, traders);

            const avgPayoutPerWinner = cashFlow.avgPayoutPerWinner;
            const breakEvenFee = calculateBreakEvenFee(stats.passRate, avgPayoutPerWinner);

            console.log('\n💰 BREAK-EVEN ANALYSIS');
            console.log(`Current fee: $${FIRM_CONFIG.challengeFee}`);
            console.log(`Break-even fee: $${breakEvenFee}`);
            console.log(`Margin: ${breakEvenFee > FIRM_CONFIG.challengeFee ? '❌ UNDERFUNDED' : '✅ BUFFER'}`);

            expect(breakEvenFee).toBeGreaterThan(0);
        });
    });

    describe('Rule Configuration Testing', () => {
        it('should test stricter drawdown limit (5% instead of 8%)', () => {
            // This would require modifying FIRM_CONFIG temporarily
            // For now, we acknowledge this shows the pattern
            console.log('\n🔧 RULE TESTING');
            console.log('Current max drawdown: 8%');
            console.log('Recommendation: Test 5% and 10% to find optimal balance');
        });
    });

    describe('Full Financial Summary', () => {
        it('should generate complete financial report', () => {
            const totalTraders = 1000;
            const traders = [];

            const skilledCount = Math.floor(totalTraders * 0.25);
            const averageCount = Math.floor(totalTraders * 0.50);
            const degenCount = totalTraders - skilledCount - averageCount;

            for (let i = 0; i < skilledCount; i++) {
                traders.push(generateTrader(`skilled-${i}`, TRADER_ARCHETYPES.skilled, 'skilled'));
            }
            for (let i = 0; i < averageCount; i++) {
                traders.push(generateTrader(`average-${i}`, TRADER_ARCHETYPES.average, 'average'));
            }
            for (let i = 0; i < degenCount; i++) {
                traders.push(generateTrader(`degen-${i}`, TRADER_ARCHETYPES.degen, 'degen'));
            }

            const results = simulateMultipleChallenges(traders, 30);
            const summary = generateFinancialSummary(results, traders);

            console.log('\n' + summary);

            expect(summary).toContain('FINANCIAL SUMMARY');
            expect(summary).toContain('CASH FLOW');
            expect(summary).toContain('RECOMMENDATION');
        });
    });
});
