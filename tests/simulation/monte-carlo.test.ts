import { describe, it, expect } from 'vitest';
import { runMonteCarloSimulation, findOptimalFee, generateSummaryReport, exportToCSV } from '@/lib/simulation/monte-carlo';
import { FIRM_CONFIG } from '@/lib/simulation/config';

describe('Monte Carlo Simulation (Option B)', () => {
    describe('Basic Monte Carlo Run', () => {
        it('should run 100 simulations and produce statistics', { timeout: 30000 }, () => {
            const results = runMonteCarloSimulation({
                iterations: 100,
                traderCount: 100, // Smaller for speed
                firmConfig: FIRM_CONFIG,
            });

            expect(results.runs).toHaveLength(100);
            expect(results.statistics.passRate.mean).toBeGreaterThan(0);
            expect(results.statistics.passRate.mean).toBeLessThan(20); // Sanity check

            console.log('\n📊 100 MONTE CARLO RUNS:');
            console.log(`Pass rate: ${results.statistics.passRate.mean.toFixed(2)}% (±${results.statistics.passRate.stdDev.toFixed(2)}%)`);
            console.log(`Net cash flow: $${Math.round(results.statistics.netCashFlow.mean).toLocaleString()}`);
            console.log(`Insolvency risk: ${results.statistics.insolvencyProbability.toFixed(1)}%`);
        });
    });

    describe('Statistical Confidence', () => {
        it('should calculate percentiles correctly', { timeout: 30000 }, () => {
            const results = runMonteCarloSimulation({
                iterations: 100,
                traderCount: 100,
                firmConfig: FIRM_CONFIG,
            });

            const { passRate, netCashFlow } = results.statistics;

            // 10th percentile should be less than median
            expect(passRate.p10).toBeLessThan(passRate.median);
            // 90th percentile should be greater than median
            expect(passRate.p90).toBeGreaterThan(passRate.median);

            console.log('\n📈 CONFIDENCE INTERVALS:');
            console.log(`Pass rate: ${passRate.p10.toFixed(1)}% - ${passRate.p90.toFixed(1)}%`);
            console.log(`Cash flow: $${Math.round(netCashFlow.p10).toLocaleString()} - $${Math.round(netCashFlow.p90).toLocaleString()}`);
        });
    });

    describe('Optimal Fee Finder', () => {
        it('should find optimal fee in range', { timeout: 60000 }, () => {
            const optimal = findOptimalFee(
                {
                    iterations: 50, // Small for speed
                    traderCount: 100,
                    firmConfig: FIRM_CONFIG,
                },
                140,
                200,
                50
            );

            expect(optimal.optimalFee).toBeGreaterThanOrEqual(140);
            expect(optimal.optimalFee).toBeLessThanOrEqual(200);

            console.log('\n💰 OPTIMAL FEE SEARCH:');
            console.log(`Optimal fee: $${optimal.optimalFee}`);
            console.log(`Projected cash flow: $${Math.round(optimal.projectedCashFlow).toLocaleString()}`);
        });
    });

    describe('Export Functions', () => {
        it('should export to CSV format', { timeout: 15000 }, () => {
            const results = runMonteCarloSimulation({
                iterations: 10,
                traderCount: 100,
                firmConfig: FIRM_CONFIG,
            });

            const csv = exportToCSV(results);

            expect(csv).toContain('Run ID');
            expect(csv).toContain('Pass Rate');
            expect(csv).toContain('Net Cash Flow');

            const lines = csv.split('\n');
            expect(lines.length).toBe(11); // 10 runs + header
        });

        it('should generate summary report', { timeout: 30000 }, () => {
            const results = runMonteCarloSimulation({
                iterations: 50,
                traderCount: 100,
                firmConfig: FIRM_CONFIG,
            });

            const summary = generateSummaryReport(results);

            expect(summary).toContain('MONTE CARLO SIMULATION SUMMARY');
            expect(summary).toContain('PASS RATE STATISTICS');
            expect(summary).toContain('RISK METRICS');

            console.log('\n' + summary);
        });
    });
});
