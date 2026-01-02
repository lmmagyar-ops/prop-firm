/**
 * Real-World Attrition Model
 * 
 * Based on actual prop firm data:
 * - Traders buy 2x evals on average (re-attempts)
 * - 8% pass evaluation
 * - 50% attrition from funded → first payout (3% net)
 * - First payout capped at 10% of starting balance
 * - Ongoing attrition handled via A-book hedging
 */

import { FirmConfig } from './config';

export interface AttritionConfig {
    evalMultiplier: number;           // Average evals per trader (1.5-3x)
    evaluationPassRate: number;        // 8% pass evaluation
    fundedToPayoutRate: number;        // 3% survive to first payout
    firstPayoutCapPercent: number;     // 10% of starting balance
    ongoingAttritionRate: number;      // Attrition after first payout
}

export interface RealWorldProjection {
    totalTraders: number;
    totalEvals: number;

    revenue: {
        totalRevenue: number;
        revenuePerTrader: number;
    };

    funnel: {
        evaluationPasses: number;
        fundedAccounts: number;
        firstPayouts: number;
        ongoingTraders: number;
    };

    payouts: {
        firstPayoutTotal: number;
        avgFirstPayout: number;
        ongoingPayoutEstimate: number;
        totalPayoutLiability: number;
    };

    cashFlow: {
        netCashFlow: number;
        profitPerTrader: number;
        profitMargin: number;
    };
}

/**
 * Calculate real-world projection with attrition
 */
export function calculateRealWorldProjection(
    traderCount: number,
    firmConfig: FirmConfig,
    attritionConfig: AttritionConfig
): RealWorldProjection {
    // Total evals (accounting for re-buys)
    const totalEvals = Math.round(traderCount * attritionConfig.evalMultiplier);

    // Revenue
    const totalRevenue = totalEvals * firmConfig.challengeFee;
    const revenuePerTrader = totalRevenue / traderCount;

    // Funnel
    const evaluationPasses = Math.round(totalEvals * attritionConfig.evaluationPassRate);
    const fundedAccounts = evaluationPasses; // All who pass get funded
    const firstPayouts = Math.round(totalEvals * attritionConfig.fundedToPayoutRate);
    const ongoingTraders = Math.round(firstPayouts * (1 - attritionConfig.ongoingAttritionRate));

    // First payout calculation (capped at 10%)
    const cappedFirstPayout = firmConfig.startingBalance * attritionConfig.firstPayoutCapPercent;
    const traderShareFirstPayout = cappedFirstPayout * firmConfig.payoutSplit;
    const firstPayoutTotal = firstPayouts * traderShareFirstPayout;

    // Ongoing payouts (conservative estimate - degens blow up, real traders A-booked)
    const avgOngoingPayout = firmConfig.startingBalance * 0.05; // 5% per month after first
    const ongoingPayoutEstimate = ongoingTraders * avgOngoingPayout * firmConfig.payoutSplit;

    // Total payout liability
    const totalPayoutLiability = firstPayoutTotal + ongoingPayoutEstimate;

    // Cash flow
    const netCashFlow = totalRevenue - totalPayoutLiability;
    const profitPerTrader = netCashFlow / traderCount;
    const profitMargin = (netCashFlow / totalRevenue) * 100;

    return {
        totalTraders: traderCount,
        totalEvals,

        revenue: {
            totalRevenue,
            revenuePerTrader,
        },

        funnel: {
            evaluationPasses,
            fundedAccounts,
            firstPayouts,
            ongoingTraders,
        },

        payouts: {
            firstPayoutTotal,
            avgFirstPayout: traderShareFirstPayout,
            ongoingPayoutEstimate,
            totalPayoutLiability,
        },

        cashFlow: {
            netCashFlow,
            profitPerTrader,
            profitMargin,
        },
    };
}

/**
 * Generate detailed attrition report
 */
export function generateAttritionReport(projection: RealWorldProjection): string {
    const { totalTraders, totalEvals, revenue, funnel, payouts, cashFlow } = projection;

    return `
REAL-WORLD ATTRITION MODEL
==========================
Based on actual prop firm data

TRADER ACQUISITION
------------------
Total Traders:      ${totalTraders.toLocaleString()}
Eval Multiplier:    ${(totalEvals / totalTraders).toFixed(1)}x
Total Evals Sold:   ${totalEvals.toLocaleString()}

REVENUE
-------
Total Revenue:      $${revenue.totalRevenue.toLocaleString()}
Per Trader:         $${Math.round(revenue.revenuePerTrader).toLocaleString()}

ATTRITION FUNNEL
----------------
Eval Attempts:      ${totalEvals.toLocaleString()} (100%)
├─ Pass Eval:       ${funnel.evaluationPasses.toLocaleString()} (${((funnel.evaluationPasses / totalEvals) * 100).toFixed(1)}%)
├─ Get Funded:      ${funnel.fundedAccounts.toLocaleString()}
├─ First Payout:    ${funnel.firstPayouts.toLocaleString()} (${((funnel.firstPayouts / totalEvals) * 100).toFixed(1)}% of total)
└─ Ongoing:         ${funnel.ongoingTraders.toLocaleString()} (survivors)

PAYOUT LIABILITY
----------------
First Payouts:      ${funnel.firstPayouts.toLocaleString()} × $${Math.round(payouts.avgFirstPayout).toLocaleString()} = $${payouts.firstPayoutTotal.toLocaleString()}
Ongoing (estimate): ${funnel.ongoingTraders.toLocaleString()} traders × avg = $${Math.round(payouts.ongoingPayoutEstimate).toLocaleString()}
Total Liability:    $${Math.round(payouts.totalPayoutLiability).toLocaleString()}

CASH FLOW
---------
Revenue:            $${revenue.totalRevenue.toLocaleString()}
Payout Liability:   $${Math.round(payouts.totalPayoutLiability).toLocaleString()}
Net Cash Flow:      $${Math.round(cashFlow.netCashFlow).toLocaleString()}

METRICS
-------
Profit/Trader:      $${Math.round(cashFlow.profitPerTrader).toLocaleString()}
Profit Margin:      ${cashFlow.profitMargin.toFixed(1)}%
Status:             ${cashFlow.netCashFlow > 0 ? '✅ PROFITABLE' : '❌ UNPROFITABLE'}

KEY INSIGHTS
------------
${cashFlow.netCashFlow > 0
            ? `✅ Firm is profitable with ${((funnel.firstPayouts / totalEvals) * 100).toFixed(1)}% payout rate
✅ Eval multiplier (${(totalEvals / totalTraders).toFixed(1)}x) is critical to profitability
✅ First payout cap keeps liability manageable
✅ A-book strategy for ongoing traders transfers risk`
            : `⚠️ Need to increase eval multiplier or reduce payout rate
⚠️ Consider tightening evaluation rules
⚠️ Implement stricter first payout caps`}
  `.trim();
}

/**
 * Compare original simulation vs real-world model
 */
export function compareModels(
    originalNet: number,
    realWorldProjection: RealWorldProjection
): string {
    const improvement = realWorldProjection.cashFlow.netCashFlow - originalNet;
    const percentChange = ((improvement / Math.abs(originalNet)) * 100);

    return `
MODEL COMPARISON
================
Per 1,000 Traders:

ORIGINAL SIMULATION (Option A):
- 1 eval per trader
- 3.1% pass = get full payout
- Avg payout: $8,000
- Net: $${originalNet.toLocaleString()}

REAL-WORLD MODEL (Option D):
- ${(realWorldProjection.totalEvals / realWorldProjection.totalTraders).toFixed(1)}x evals per trader
- 8% pass eval → 3% get payout
- First payout: $${Math.round(realWorldProjection.payouts.avgFirstPayout).toLocaleString()} (capped)
- Net: $${Math.round(realWorldProjection.cashFlow.netCashFlow).toLocaleString()}

DIFFERENCE:
${improvement > 0 ? '✅' : '❌'} ${improvement > 0 ? '+' : ''}$${Math.round(improvement).toLocaleString()} (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(0)}%)

CRITICAL FACTORS:
1. Eval Multiplier: ${((realWorldProjection.totalEvals / realWorldProjection.totalTraders) - 1).toFixed(1)}x additional revenue
2. Attrition: 8% pass → 3% payout (62.5% funded attrition)
3. Payout Cap: $${Math.round(realWorldProjection.payouts.avgFirstPayout).toLocaleString()} vs $8,000 (${((1 - (realWorldProjection.payouts.avgFirstPayout / 8000)) * 100).toFixed(0)}% reduction)
  `.trim();
}

/**
 * Sensitivity analysis - test different eval multipliers
 */
export function runSensitivityAnalysis(
    firmConfig: FirmConfig,
    baseAttritionConfig: AttritionConfig
): Array<{ multiplier: number; netCashFlow: number; profitMargin: number }> {
    const results = [];

    for (let mult = 1.0; mult <= 3.5; mult += 0.25) {
        const config = { ...baseAttritionConfig, evalMultiplier: mult };
        const projection = calculateRealWorldProjection(1000, firmConfig, config);

        results.push({
            multiplier: mult,
            netCashFlow: projection.cashFlow.netCashFlow,
            profitMargin: projection.cashFlow.profitMargin,
        });
    }

    return results;
}
