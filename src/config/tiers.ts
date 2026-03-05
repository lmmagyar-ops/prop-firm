/**
 * CANONICAL TIER CONFIGURATION — Single Source of Truth
 * 
 * ALL tier-specific values must come from here. No more 4-way splits.
 * 
 * Consumers:
 *   - createChallengeAction (challenge creation)
 *   - plans.ts (pricing page display)
 *   - funded-rules.ts (funded phase rules)
 *   - risk.ts / risk-monitor.ts (risk evaluation)
 *   - evaluator.ts (challenge pass/fail)
 */

export interface TierConfig {
    id: string;
    startingBalance: number;

    // Drawdown Rules (percentages → converted to absolute at creation time)
    maxDailyDrawdownPercent: number;
    maxTotalDrawdownPercent: number;

    // Profit Target (percentage → converted to absolute at creation time)
    profitTargetPercent: number;

    // Position Sizing
    maxPositionSizePercent: number;      // Per-event exposure cap
    maxCategoryExposurePercent: number;  // Per-category exposure cap

    // Volume-Based Limits
    lowVolumeThreshold: number;
    lowVolumeMaxPositionPercent: number;
    maxVolumeImpactPercent: number;
    minMarketVolume: number;

    // Position Limits
    maxOpenPositions: number;

    // Payout (funded phase)
    profitSplit: number;
    payoutCap: number;
    minTradingDays: number;

    // Duration
    durationDays: number;
}

/**
 * Tier definitions — values match plans.ts (the user-facing display)
 * 
 * $5k:  3% daily / 6% max DD / 10% profit target ($500)
 * $10k: 4% daily / 8% max DD / 12% profit target ($1,200)
 * $25k: 3% daily / 6% max DD / 10% profit target ($2,500)
 */
export const TIERS: Record<string, TierConfig> = {
    "5k": {
        id: "5k",
        startingBalance: 5000,
        maxDailyDrawdownPercent: 0.03,    // 3% = $150
        maxTotalDrawdownPercent: 0.06,    // 6% = $300
        profitTargetPercent: 0.10,        // 10% = $500
        maxPositionSizePercent: 0.05,
        maxCategoryExposurePercent: 0.10,
        lowVolumeThreshold: 10_000_000,
        lowVolumeMaxPositionPercent: 0.025,
        maxVolumeImpactPercent: 0.10,
        minMarketVolume: 100_000,
        maxOpenPositions: 10,
        profitSplit: 0.80,
        payoutCap: 5000,
        minTradingDays: 5,
        durationDays: 60,
    },

    "10k": {
        id: "10k",
        startingBalance: 10000,
        maxDailyDrawdownPercent: 0.04,    // 4% = $400
        maxTotalDrawdownPercent: 0.08,    // 8% = $800
        profitTargetPercent: 0.12,        // 12% = $1,200
        maxPositionSizePercent: 0.05,
        maxCategoryExposurePercent: 0.10,
        lowVolumeThreshold: 10_000_000,
        lowVolumeMaxPositionPercent: 0.025,
        maxVolumeImpactPercent: 0.10,
        minMarketVolume: 100_000,
        maxOpenPositions: 15,
        profitSplit: 0.80,
        payoutCap: 10000,
        minTradingDays: 5,
        durationDays: 60,
    },

    "25k": {
        id: "25k",
        startingBalance: 25000,
        maxDailyDrawdownPercent: 0.03,    // 3% = $750
        maxTotalDrawdownPercent: 0.06,    // 6% = $1,500
        profitTargetPercent: 0.10,        // 10% = $2,500
        maxPositionSizePercent: 0.05,
        maxCategoryExposurePercent: 0.10,
        lowVolumeThreshold: 10_000_000,
        lowVolumeMaxPositionPercent: 0.025,
        maxVolumeImpactPercent: 0.10,
        minMarketVolume: 100_000,
        maxOpenPositions: 20,
        profitSplit: 0.80,
        payoutCap: 25000,
        minTradingDays: 5,
        durationDays: 60,
    },
} as const;

/**
 * Get tier config by ID. Throws on unknown tier — fail-fast, no silent defaults.
 */
export function getTierConfig(tierId: string): TierConfig {
    const config = TIERS[tierId];
    if (!config) {
        throw new Error(`Unknown tier: "${tierId}". Valid tiers: ${Object.keys(TIERS).join(", ")}`);
    }
    return config;
}

/**
 * Get tier ID from starting balance.
 */
export function getTierFromBalance(startingBalance: number): string {
    if (startingBalance >= 25000) return "25k";
    if (startingBalance >= 10000) return "10k";
    return "5k";
}

/**
 * Build rulesConfig for a tier (stored in challenges.rulesConfig).
 * Computes absolute dollar values from percentages.
 */
export function buildRulesConfig(tierId: string) {
    const tier = getTierConfig(tierId);
    const bal = tier.startingBalance;

    return {
        tier: tier.id,
        startingBalance: bal,

        // ABSOLUTE DOLLAR VALUES (what the evaluator/risk-monitor consume)
        profitTarget: bal * tier.profitTargetPercent,
        maxDrawdown: bal * tier.maxTotalDrawdownPercent,

        // PERCENTAGES (used by risk engine for dynamic calculations)
        maxTotalDrawdownPercent: tier.maxTotalDrawdownPercent,
        maxDailyDrawdownPercent: tier.maxDailyDrawdownPercent,
        profitTargetPercent: tier.profitTargetPercent,

        // Position Sizing
        maxPositionSizePercent: tier.maxPositionSizePercent,
        maxCategoryExposurePercent: tier.maxCategoryExposurePercent,
        lowVolumeThreshold: tier.lowVolumeThreshold,
        lowVolumeMaxPositionPercent: tier.lowVolumeMaxPositionPercent,

        // Position Limits
        maxOpenPositions: tier.maxOpenPositions,

        // Liquidity
        maxVolumeImpactPercent: tier.maxVolumeImpactPercent,
        minMarketVolume: tier.minMarketVolume,

        // Duration
        durationDays: tier.durationDays,

        // Payout (used during funded transition)
        profitSplit: tier.profitSplit,

        // Legacy compatibility
        maxDrawdownPercent: tier.maxTotalDrawdownPercent,
        dailyLossPercent: tier.maxDailyDrawdownPercent,
    };
}

export type { TierConfig as TierConfigType };
