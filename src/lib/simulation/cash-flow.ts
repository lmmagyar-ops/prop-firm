/**
 * Cash Flow Projections
 * 
 * Calculate firm's financial position based on simulation results.
 * Determines revenue, payout liabilities, and insolvency risk.
 */

import { ChallengeResult, calculateMonthlyProfit } from './challenge-simulator';
import { Trader } from './trader-behavior';
import { FIRM_CONFIG } from './config';

export interface CashFlowProjection {
    revenue: number;
    payoutLiability: number;
    netCashFlow: number;
    insolvencyRisk: number;
    avgPayoutPerWinner: number;
    payoutToRevenueRatio: number;
}

export interface MonthlyProjection {
    month: number;
    revenue: number;
    payouts: number;
    netCashFlow: number;
    cumulativeCashFlow: number;
    fundedTraders: number;
}

/**
 * Calculate immediate cash flow from challenge results
 */
export function calculateCashFlow(
    results: ChallengeResult[],
    traders: Trader[]
): CashFlowProjection {
    const total = results.length;
    const passed = results.filter(r => r.outcome === 'PASS');

    // Revenue = all traders pay entry fee
    const revenue = total * FIRM_CONFIG.challengeFee;

    // Payout liability = sum of payouts to funded traders
    let totalPayoutLiability = 0;

    passed.forEach((result, index) => {
        const trader = traders[index];
        // Estimate monthly profit for funded trader
        const monthlyProfit = calculateMonthlyProfit(trader, FIRM_CONFIG.startingBalance);
        // Firm pays 80% to trader
        const payout = monthlyProfit * FIRM_CONFIG.payoutSplit;
        totalPayoutLiability += payout;
    });

    const netCashFlow = revenue - totalPayoutLiability;
    const avgPayoutPerWinner = passed.length > 0 ? totalPayoutLiability / passed.length : 0;
    const payoutToRevenueRatio = revenue > 0 ? totalPayoutLiability / revenue : 0;

    // Insolvency risk: simple metric (negative cash flow = 100% risk)
    const insolvencyRisk = netCashFlow < 0 ? 100 : 0;

    return {
        revenue,
        payoutLiability: totalPayoutLiability,
        netCashFlow,
        insolvencyRisk,
        avgPayoutPerWinner,
        payoutToRevenueRatio,
    };
}

/**
 * Project cash flow over multiple months
 */
export function projectMultipleMonths(
    monthlyTraderCount: number,
    passRate: number,
    avgMonthlyProfitPerWinner: number,
    months: number = 3
): MonthlyProjection[] {
    const projections: MonthlyProjection[] = [];
    let cumulativeCashFlow = 0;

    for (let month = 1; month <= months; month++) {
        const revenue = monthlyTraderCount * FIRM_CONFIG.challengeFee;
        const expectedWinners = monthlyTraderCount * (passRate / 100);
        const payouts = expectedWinners * avgMonthlyProfitPerWinner * FIRM_CONFIG.payoutSplit;
        const netCashFlow = revenue - payouts;
        cumulativeCashFlow += netCashFlow;

        projections.push({
            month,
            revenue,
            payouts,
            netCashFlow,
            cumulativeCashFlow,
            fundedTraders: Math.round(expectedWinners),
        });
    }

    return projections;
}

/**
 * Calculate break-even challenge fee
 */
export function calculateBreakEvenFee(
    passRate: number,
    avgMonthlyProfitPerWinner: number
): number {
    // Break-even when: revenue = payout liability
    // traders × fee = (traders × passRate) × avgPayout × payoutSplit
    // fee = passRate × avgPayout × payoutSplit

    const breakEvenFee = (passRate / 100) * avgMonthlyProfitPerWinner * FIRM_CONFIG.payoutSplit;
    return Math.ceil(breakEvenFee); // Round up to nearest dollar
}

/**
 * Analyze payout concentration risk
 */
export function analyzePayoutConcentration(
    results: ChallengeResult[],
    traders: Trader[]
): { top10Percent: number; giniCoefficient: number } {
    const passed = results
        .map((result, index) => ({ result, trader: traders[index] }))
        .filter(({ result }) => result.outcome === 'PASS');

    if (passed.length === 0) {
        return { top10Percent: 0, giniCoefficient: 0 };
    }

    // Calculate payouts for each winner
    const payouts = passed.map(({ trader }) => {
        const monthlyProfit = calculateMonthlyProfit(trader, FIRM_CONFIG.startingBalance);
        return monthlyProfit * FIRM_CONFIG.payoutSplit;
    });

    // Sort descending
    payouts.sort((a, b) => b - a);

    // Top 10% concentration
    const top10Count = Math.ceil(payouts.length * 0.1);
    const top10Sum = payouts.slice(0, top10Count).reduce((a, b) => a + b, 0);
    const totalSum = payouts.reduce((a, b) => a + b, 0);
    const top10Percent = (top10Sum / totalSum) * 100;

    // Gini coefficient (inequality measure)
    const n = payouts.length;
    let sumOfDifferences = 0;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            sumOfDifferences += Math.abs(payouts[i] - payouts[j]);
        }
    }
    const giniCoefficient = sumOfDifferences / (2 * n * totalSum);

    return { top10Percent, giniCoefficient };
}

/**
 * Generate financial summary
 */
export function generateFinancialSummary(
    results: ChallengeResult[],
    traders: Trader[]
): string {
    const cashFlow = calculateCashFlow(results, traders);
    const concentration = analyzePayoutConcentration(results, traders);

    const passRate = (results.filter(r => r.outcome === 'PASS').length / results.length) * 100;

    return `
FINANCIAL SUMMARY
=================
Total Traders:      ${results.length}
Pass Rate:          ${passRate.toFixed(1)}%
Funded Traders:     ${results.filter(r => r.outcome === 'PASS').length}

CASH FLOW
---------
Revenue:            $${cashFlow.revenue.toFixed(0).toLocaleString()}
Payout Liability:   $${cashFlow.payoutLiability.toFixed(0).toLocaleString()}
Net Cash Flow:      $${cashFlow.netCashFlow.toFixed(0).toLocaleString()}

METRICS
-------
Avg Payout/Winner:  $${cashFlow.avgPayoutPerWinner.toFixed(0)}
Payout/Revenue:     ${(cashFlow.payoutToRevenueRatio * 100).toFixed(1)}%
Top 10% Share:      ${concentration.top10Percent.toFixed(1)}%
Insolvency Risk:    ${cashFlow.insolvencyRisk}%

RECOMMENDATION
--------------
${cashFlow.netCashFlow > 0
            ? '✅ PROFITABLE - Current rules appear sustainable'
            : '❌ UNPROFITABLE - Consider increasing fees or tightening rules'}
  `.trim();
}
