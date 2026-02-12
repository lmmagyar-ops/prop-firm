/**
 * Monte Carlo Simulation Engine
 * 
 * Runs thousands of simulations with statistical aggregation.
 * Provides percentiles, confidence intervals, and optimization.
 */

import { generateTrader, Trader } from './trader-behavior';
import { runChallenge, ChallengeResult } from './challenge-simulator';
import { calculateCashFlow, CashFlowProjection } from './cash-flow';
import { TRADER_ARCHETYPES, FirmConfig, TraderArchetype, DEFAULT_DISTRIBUTION } from './config';
// Client-safe logger — this module is imported by 'use client' pages (admin/simulation).
// Cannot use winston (Node.js only). Console calls are sufficient for simulation output.
const logger = {
    info: (msg: string) => console.warn(`[MonteCarlo] ${msg}`),
    error: (msg: string) => console.error(`[MonteCarlo] ${msg}`),
};

export interface MonteCarloConfig {
    iterations: number;
    traderCount: number;
    firmConfig: FirmConfig;
    traderDistribution?: {
        skilled: number;
        average: number;
        degen: number;
    };
}

export interface SimulationRun {
    runId: number;
    passRate: number;
    revenue: number;
    payoutLiability: number;
    netCashFlow: number;
    fundedCount: number;
    avgPayoutPerWinner: number;
}

export interface MonteCarloResults {
    config: MonteCarloConfig;
    runs: SimulationRun[];
    statistics: {
        passRate: {
            mean: number;
            median: number;
            p10: number;
            p90: number;
            stdDev: number;
        };
        netCashFlow: {
            mean: number;
            median: number;
            p10: number;
            p90: number;
            stdDev: number;
        };
        insolvencyProbability: number;
        breakEvenProbability: number;
    };
    optimalFee?: number;
}

/**
 * Run Monte Carlo simulation
 */
export function runMonteCarloSimulation(config: MonteCarloConfig): MonteCarloResults {
    const runs: SimulationRun[] = [];

    logger.info(`🎲 Running ${config.iterations} Monte Carlo simulations...`);

    for (let i = 0; i < config.iterations; i++) {
        // Generate traders for this run
        const traders = generateTradersForRun(config);

        // Run challenges
        const results = traders.map(trader => runChallenge(trader, config.firmConfig.maxChallengeDays));

        // Calculate cash flow
        const cashFlow = calculateCashFlow(results, traders);

        // Store run data
        runs.push({
            runId: i + 1,
            passRate: (results.filter(r => r.outcome === 'PASS').length / results.length) * 100,
            revenue: cashFlow.revenue,
            payoutLiability: cashFlow.payoutLiability,
            netCashFlow: cashFlow.netCashFlow,
            fundedCount: results.filter(r => r.outcome === 'PASS').length,
            avgPayoutPerWinner: cashFlow.avgPayoutPerWinner,
        });

        // Progress indicator
        if ((i + 1) % 100 === 0) {
            logger.info(`  ... ${i + 1}/${config.iterations} complete`);
        }
    }

    logger.info(`✅ Monte Carlo complete!`);

    // Calculate statistics
    const statistics = calculateStatistics(runs);

    return {
        config,
        runs,
        statistics,
    };
}

/**
 * Generate traders for a single simulation run
 */
function generateTradersForRun(config: MonteCarloConfig): Trader[] {
    const distribution = config.traderDistribution || DEFAULT_DISTRIBUTION;
    const traders: Trader[] = [];

    const skilledCount = Math.floor(config.traderCount * distribution.skilled);
    const averageCount = Math.floor(config.traderCount * distribution.average);
    const degenCount = config.traderCount - skilledCount - averageCount;

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

    return traders;
}

/**
 * Calculate statistical aggregates from simulation runs
 */
function calculateStatistics(runs: SimulationRun[]): MonteCarloResults['statistics'] {
    const passRates = runs.map(r => r.passRate);
    const netCashFlows = runs.map(r => r.netCashFlow);

    // Insolvency probability (% of runs with negative cash flow)
    const insolvencyProbability = (runs.filter(r => r.netCashFlow < 0).length / runs.length) * 100;

    // Break-even probability (% of runs with positive or zero cash flow)
    const breakEvenProbability = (runs.filter(r => r.netCashFlow >= 0).length / runs.length) * 100;

    return {
        passRate: {
            mean: mean(passRates),
            median: percentile(passRates, 50),
            p10: percentile(passRates, 10),
            p90: percentile(passRates, 90),
            stdDev: standardDeviation(passRates),
        },
        netCashFlow: {
            mean: mean(netCashFlows),
            median: percentile(netCashFlows, 50),
            p10: percentile(netCashFlows, 10),
            p90: percentile(netCashFlows, 90),
            stdDev: standardDeviation(netCashFlows),
        },
        insolvencyProbability,
        breakEvenProbability,
    };
}

/**
 * Calculate mean
 */
function mean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate percentile
 */
function percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
    const avg = mean(values);
    const squareDiffs = values.map(val => Math.pow(val - avg, 2));
    const avgSquareDiff = mean(squareDiffs);
    return Math.sqrt(avgSquareDiff);
}

/**
 * Find optimal fee through binary search simulation
 */
export function findOptimalFee(
    baseConfig: MonteCarloConfig,
    minFee: number,
    maxFee: number,
    iterations: number = 100
): { optimalFee: number; projectedCashFlow: number } {
    logger.info(`🔍 Searching for optimal fee between $${minFee} and $${maxFee}...`);

    let bestFee = minFee;
    let bestCashFlow = -Infinity;

    const feeStep = (maxFee - minFee) / 10;

    for (let fee = minFee; fee <= maxFee; fee += feeStep) {
        const config = {
            ...baseConfig,
            firmConfig: {
                ...baseConfig.firmConfig,
                challengeFee: Math.round(fee),
            },
            iterations: Math.min(iterations, baseConfig.iterations),
        };

        const results = runMonteCarloSimulation(config);
        const avgCashFlow = results.statistics.netCashFlow.mean;

        logger.info(`  Fee $${Math.round(fee)}: Avg cash flow = $${Math.round(avgCashFlow)}`);

        if (avgCashFlow > bestCashFlow) {
            bestCashFlow = avgCashFlow;
            bestFee = Math.round(fee);
        }
    }

    logger.info(`✅ Optimal fee: $${bestFee} (projected: $${Math.round(bestCashFlow)})`);

    return {
        optimalFee: bestFee,
        projectedCashFlow: bestCashFlow,
    };
}

/**
 * Export results to CSV
 */
export function exportToCSV(results: MonteCarloResults): string {
    const header = 'Run ID,Pass Rate (%),Revenue ($),Payout Liability ($),Net Cash Flow ($),Funded Count\n';

    const rows = results.runs.map(run =>
        `${run.runId},${run.passRate.toFixed(2)},${run.revenue},${run.payoutLiability.toFixed(0)},${run.netCashFlow.toFixed(0)},${run.fundedCount}`
    ).join('\n');

    return header + rows;
}

/**
 * Generate summary report
 */
export function generateSummaryReport(results: MonteCarloResults): string {
    const { statistics, config } = results;

    return `
MONTE CARLO SIMULATION SUMMARY
==============================
Configuration:
- Iterations: ${config.iterations.toLocaleString()}
- Traders per run: ${config.traderCount}
- Challenge fee: $${config.firmConfig.challengeFee}
- Max drawdown: ${(config.firmConfig.maxDrawdownPercent * 100).toFixed(0)}%
- Profit target: ${(config.firmConfig.profitTargetPercent * 100).toFixed(0)}%

PASS RATE STATISTICS
--------------------
Mean:       ${statistics.passRate.mean.toFixed(2)}%
Median:     ${statistics.passRate.median.toFixed(2)}%
10th %ile:  ${statistics.passRate.p10.toFixed(2)}%
90th %ile:  ${statistics.passRate.p90.toFixed(2)}%
Std Dev:    ${statistics.passRate.stdDev.toFixed(2)}%

NET CASH FLOW STATISTICS
------------------------
Mean:       $${Math.round(statistics.netCashFlow.mean).toLocaleString()}
Median:     $${Math.round(statistics.netCashFlow.median).toLocaleString()}
10th %ile:  $${Math.round(statistics.netCashFlow.p10).toLocaleString()}
90th %ile:  $${Math.round(statistics.netCashFlow.p90).toLocaleString()}
Std Dev:    $${Math.round(statistics.netCashFlow.stdDev).toLocaleString()}

RISK METRICS
------------
Insolvency Probability:  ${statistics.insolvencyProbability.toFixed(1)}%
Break-Even Probability:  ${statistics.breakEvenProbability.toFixed(1)}%

RECOMMENDATION
--------------
${statistics.insolvencyProbability < 5
            ? '✅ LOW RISK - Current configuration appears sustainable'
            : statistics.insolvencyProbability < 25
                ? '⚠️ MODERATE RISK - Consider tightening rules or increasing fees'
                : '❌ HIGH RISK - Current configuration likely to result in losses'}
  `.trim();
}
