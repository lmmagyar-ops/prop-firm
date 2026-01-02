/**
 * Multi-Tier Analysis Engine
 * 
 * Compares profitability across all three account tiers ($5k, $10k, $25k)
 * using the real-world attrition model with tier-specific parameters.
 */

import { ACCOUNT_TIERS } from './account-tiers';
import { calculateRealWorldProjection, type AttritionConfig } from './attrition-model';

export interface TierAnalysisResult {
    tier: string;
    tierLabel: string;
    challengeFee: number;
    startingBalance: number;
    maxDrawdownPercent: number;
    profitTargetPercent: number;

    // Revenue metrics
    totalRevenue: number;
    revenuePerTrader: number;

    // Payout metrics
    totalPayouts: number;
    payoutsPerTrader: number;

    // Profitability
    netProfit: number;
    profitMargin: number;
    profitPerTrader: number;

    // Efficiency
    breakEvenTraders: number;
    effectiveCostPerAcquisition: number;

    // Funnel metrics
    totalEvaluations: number;
    passedEvaluations: number;
    fundedTraders: number;
    firstPayoutTraders: number;
    ongoingTraders: number;
}

export interface MultiTierComparison {
    tiers: TierAnalysisResult[];
    bestByMargin: string;
    bestByAbsoluteProfit: string;
    config: {
        tradersPerTier: number;
        evalMultiplier: number;
        evaluationPassRate: number;
        fundedToPayoutRate: number;
        ongoingAttritionRate: number;
    };
}

/**
 * Analyzes a single tier with the real-world attrition model
 */
export function analyzeTier(
    tierKey: keyof typeof ACCOUNT_TIERS,
    tradersPerTier: number,
    attritionConfig: AttritionConfig
): TierAnalysisResult {
    const tierConfig = ACCOUNT_TIERS[tierKey];

    // Construct FirmConfig from tier config
    const firmConfig = {
        challengeFee: tierConfig.challengeFee,
        startingBalance: tierConfig.startingBalance,
        maxDrawdownPercent: tierConfig.maxDrawdownPercent,
        dailyLossLimitPercent: tierConfig.dailyLossLimitPercent,
        profitTargetPercent: tierConfig.profitTargetPercent,
        payoutSplit: tierConfig.payoutSplit,
        payoutCap: tierConfig.payoutCap,
        minTradingDays: tierConfig.minTradingDays,
        consistencyFlagPercent: tierConfig.consistencyFlagPercent,
        maxChallengeDays: tierConfig.maxChallengeDays,
    };

    // Run the attrition model for this tier
    const projection = calculateRealWorldProjection(tradersPerTier, firmConfig, attritionConfig);

    // Calculate additional metrics
    const netProfit = projection.cashFlow.netCashFlow;
    const profitMargin = projection.cashFlow.profitMargin;
    const breakEvenTraders = Math.ceil(projection.payouts.totalPayoutLiability / (tierConfig.challengeFee * attritionConfig.evalMultiplier));
    const effectiveCostPerAcquisition = projection.payouts.totalPayoutLiability / tradersPerTier;

    // Tier labels
    const tierLabels: Record<string, string> = {
        small: '$5k',
        medium: '$10k',
        large: '$25k'
    };

    return {
        tier: tierKey,
        tierLabel: tierLabels[tierKey] || tierKey,
        challengeFee: tierConfig.challengeFee,
        startingBalance: tierConfig.startingBalance,
        maxDrawdownPercent: tierConfig.maxDrawdownPercent * 100,
        profitTargetPercent: tierConfig.profitTargetPercent * 100,

        totalRevenue: projection.revenue.totalRevenue,
        revenuePerTrader: projection.revenue.revenuePerTrader,

        totalPayouts: projection.payouts.totalPayoutLiability,
        payoutsPerTrader: projection.payouts.totalPayoutLiability / tradersPerTier,

        netProfit,
        profitMargin,
        profitPerTrader: projection.cashFlow.profitPerTrader,

        breakEvenTraders,
        effectiveCostPerAcquisition,

        totalEvaluations: projection.totalEvals,
        passedEvaluations: projection.funnel.evaluationPasses,
        fundedTraders: projection.funnel.fundedAccounts,
        firstPayoutTraders: projection.funnel.firstPayouts,
        ongoingTraders: projection.funnel.ongoingTraders,
    };
}

/**
 * Compares all three account tiers and identifies the best performers
 */
export function compareAllTiers(
    tradersPerTier: number = 1000,
    attritionConfig: Partial<AttritionConfig> = {}
): MultiTierComparison {
    // Default attrition config (real-world baseline)
    const config: AttritionConfig = {
        evalMultiplier: attritionConfig.evalMultiplier ?? 2.0,
        evaluationPassRate: attritionConfig.evaluationPassRate ?? 0.08,
        fundedToPayoutRate: attritionConfig.fundedToPayoutRate ?? 0.03,
        firstPayoutCapPercent: attritionConfig.firstPayoutCapPercent ?? 0.10,
        ongoingAttritionRate: attritionConfig.ongoingAttritionRate ?? 0.50,
    };

    // Analyze each tier
    const tiers = [
        analyzeTier('small', tradersPerTier, config),
        analyzeTier('medium', tradersPerTier, config),
        analyzeTier('large', tradersPerTier, config),
    ];

    // Find best performers
    const bestByMargin = tiers.reduce((best, current) =>
        current.profitMargin > best.profitMargin ? current : best
    );

    const bestByAbsoluteProfit = tiers.reduce((best, current) =>
        current.netProfit > best.netProfit ? current : best
    );

    return {
        tiers,
        bestByMargin: bestByMargin.tierLabel,
        bestByAbsoluteProfit: bestByAbsoluteProfit.tierLabel,
        config: {
            tradersPerTier,
            evalMultiplier: config.evalMultiplier,
            evaluationPassRate: config.evaluationPassRate,
            fundedToPayoutRate: config.fundedToPayoutRate,
            ongoingAttritionRate: config.ongoingAttritionRate,
        },
    };
}

/**
 * Generates a summary report for a multi-tier comparison
 */
export function generateTierComparisonReport(comparison: MultiTierComparison): string {
    const { tiers, bestByMargin, bestByAbsoluteProfit, config } = comparison;

    let report = '# Multi-Tier Profitability Analysis\n\n';
    report += `**Configuration:**\n`;
    report += `- Traders per tier: ${config.tradersPerTier.toLocaleString()}\n`;
    report += `- Eval multiplier: ${config.evalMultiplier}x\n`;
    report += `- Pass rate: ${(config.evaluationPassRate * 100).toFixed(1)}%\n`;
    report += `- Payout rate: ${(config.fundedToPayoutRate * 100).toFixed(1)}%\n\n`;

    report += `## Summary\n\n`;
    report += `- **Best margin:** ${bestByMargin}\n`;
    report += `- **Best absolute profit:** ${bestByAbsoluteProfit}\n\n`;

    report += `## Tier Comparison\n\n`;
    report += `| Tier | Fee | Revenue | Payouts | Net Profit | Margin | Profit/Trader |\n`;
    report += `|------|-----|---------|---------|------------|--------|---------------|\n`;

    tiers.forEach(tier => {
        report += `| ${tier.tierLabel} | $${tier.challengeFee} | `;
        report += `$${tier.totalRevenue.toLocaleString()} | `;
        report += `$${tier.totalPayouts.toLocaleString()} | `;
        report += `$${tier.netProfit.toLocaleString()} | `;
        report += `${tier.profitMargin.toFixed(1)}% | `;
        report += `$${tier.profitPerTrader.toFixed(0)} |\n`;
    });

    report += `\n## Detailed Metrics\n\n`;

    tiers.forEach(tier => {
        report += `### ${tier.tierLabel} Tier\n\n`;
        report += `**Challenge Parameters:**\n`;
        report += `- Fee: $${tier.challengeFee}\n`;
        report += `- Starting balance: $${tier.startingBalance.toLocaleString()}\n`;
        report += `- Max drawdown: ${tier.maxDrawdownPercent}%\n`;
        report += `- Profit target: ${tier.profitTargetPercent}%\n\n`;

        report += `**Financial Performance:**\n`;
        report += `- Total revenue: $${tier.totalRevenue.toLocaleString()}\n`;
        report += `- Total payouts: $${tier.totalPayouts.toLocaleString()}\n`;
        report += `- Net profit: $${tier.netProfit.toLocaleString()}\n`;
        report += `- Profit margin: ${tier.profitMargin.toFixed(1)}%\n\n`;

        report += `**Efficiency Metrics:**\n`;
        report += `- Revenue per trader: $${tier.revenuePerTrader.toFixed(2)}\n`;
        report += `- Profit per trader: $${tier.profitPerTrader.toFixed(2)}\n`;
        report += `- Break-even traders: ${tier.breakEvenTraders}\n`;
        report += `- Effective CAC: $${tier.effectiveCostPerAcquisition.toFixed(2)}\n\n`;

        report += `**Funnel:**\n`;
        report += `- Total evaluations: ${tier.totalEvaluations}\n`;
        report += `- Passed: ${tier.passedEvaluations} (${((tier.passedEvaluations / tier.totalEvaluations) * 100).toFixed(1)}%)\n`;
        report += `- First payout: ${tier.firstPayoutTraders} (${((tier.firstPayoutTraders / tier.totalEvaluations) * 100).toFixed(1)}%)\n`;
        report += `- Ongoing: ${tier.ongoingTraders} (${((tier.ongoingTraders / tier.totalEvaluations) * 100).toFixed(2)}%)\n\n`;
    });

    return report;
}

/**
 * Exports tier comparison to CSV format
 */
export function exportTierComparisonCSV(comparison: MultiTierComparison): string {
    const { tiers } = comparison;

    let csv = 'Tier,Fee,Starting Balance,Max Drawdown %,Profit Target %,';
    csv += 'Revenue,Revenue/Trader,Payouts,Payouts/Trader,';
    csv += 'Net Profit,Profit Margin %,Profit/Trader,';
    csv += 'Break-even Traders,Effective CAC,';
    csv += 'Total Evals,Passed,First Payout,Ongoing\n';

    tiers.forEach(tier => {
        csv += `${tier.tierLabel},`;
        csv += `${tier.challengeFee},`;
        csv += `${tier.startingBalance},`;
        csv += `${tier.maxDrawdownPercent},`;
        csv += `${tier.profitTargetPercent},`;
        csv += `${tier.totalRevenue},`;
        csv += `${tier.revenuePerTrader.toFixed(2)},`;
        csv += `${tier.totalPayouts},`;
        csv += `${tier.payoutsPerTrader.toFixed(2)},`;
        csv += `${tier.netProfit},`;
        csv += `${tier.profitMargin.toFixed(2)},`;
        csv += `${tier.profitPerTrader.toFixed(2)},`;
        csv += `${tier.breakEvenTraders},`;
        csv += `${tier.effectiveCostPerAcquisition.toFixed(2)},`;
        csv += `${tier.totalEvaluations},`;
        csv += `${tier.passedEvaluations},`;
        csv += `${tier.firstPayoutTraders},`;
        csv += `${tier.ongoingTraders}\n`;
    });

    return csv;
}
