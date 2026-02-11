/**
 * Funded Stage Rules Configuration
 * 
 * Tiered configurations for funded trader accounts.
 * These rules are applied when a trader passes evaluation and transitions to funded phase.
 */

// Tiered funded account configurations
export const FUNDED_RULES = {
    "5k": {
        tier: "5k",
        startingBalance: 5000,

        // Drawdown Rules (Static)
        maxDailyDrawdownPercent: 0.04,   // 4% = $200
        maxTotalDrawdownPercent: 0.08,    // 8% = $400 (static from initial balance)
        maxDailyDrawdown: 200,            // Absolute value
        maxTotalDrawdown: 400,            // Absolute value

        // Position Limits
        maxOpenPositions: 10,

        // Payout Configuration
        profitSplit: 0.80,                // 80% to trader
        payoutCap: 5000,                  // Max payout = starting balance
        minTradingDays: 5,                // Per payout cycle

        // Exposure Tiers (applied dynamically by volume)
        exposureLimits: {
            highVolume: 0.05,     // >$10M = 5%
            mediumVolume: 0.025,  // $1-10M = 2.5%
            lowVolume: 0.005,     // $100k-1M = 0.5%
        },

        // Category Limits
        maxCategoryExposurePercent: 0.10, // 10% per category

        // Liquidity
        maxVolumeImpactPercent: 0.10,     // 10% of 24h volume
        minMarketVolume: 100_000,          // $100k minimum
    },

    "10k": {
        tier: "10k",
        startingBalance: 10000,

        // Drawdown Rules (Static)
        maxDailyDrawdownPercent: 0.05,   // 5% = $500
        maxTotalDrawdownPercent: 0.10,    // 10% = $1000 (static from initial balance)
        maxDailyDrawdown: 500,
        maxTotalDrawdown: 1000,

        // Position Limits
        maxOpenPositions: 15,

        // Payout Configuration
        profitSplit: 0.80,
        payoutCap: 10000,
        minTradingDays: 5,

        // Exposure Tiers
        exposureLimits: {
            highVolume: 0.05,
            mediumVolume: 0.025,
            lowVolume: 0.005,
        },

        // Category Limits
        maxCategoryExposurePercent: 0.10,

        // Liquidity
        maxVolumeImpactPercent: 0.10,
        minMarketVolume: 100_000,
    },

    "25k": {
        tier: "25k",
        startingBalance: 25000,

        // Drawdown Rules (Static)
        maxDailyDrawdownPercent: 0.05,   // 5% = $1250
        maxTotalDrawdownPercent: 0.10,    // 10% = $2500 (static from initial balance)
        maxDailyDrawdown: 1250,
        maxTotalDrawdown: 2500,

        // Position Limits
        maxOpenPositions: 20,

        // Payout Configuration
        profitSplit: 0.80,
        payoutCap: 25000,
        minTradingDays: 5,

        // Exposure Tiers
        exposureLimits: {
            highVolume: 0.05,
            mediumVolume: 0.025,
            lowVolume: 0.005,
        },

        // Category Limits
        maxCategoryExposurePercent: 0.10,

        // Liquidity
        maxVolumeImpactPercent: 0.10,
        minMarketVolume: 100_000,
    },
} as const;

// Volume-based exposure tier thresholds
export const VOLUME_EXPOSURE_TIERS = {
    high: {
        minVolume: 10_000_000,  // >$10M
        label: "High Volume"
    },
    medium: {
        minVolume: 1_000_000,   // $1M - $10M
        label: "Medium Volume"
    },
    low: {
        minVolume: 100_000,     // $100k - $1M
        label: "Low Volume"
    },
} as const;

// Consistency rule thresholds
export const CONSISTENCY_CONFIG = {
    maxSingleDayProfitPercent: 0.50,  // 50% of total profits in one day = flag
    minTradesForFlag: 3,              // Only flag if <3 trades that day (suggests gambling)
    inactivityDays: 30,               // Days of inactivity before termination
} as const;

// Resolution detection thresholds
export const RESOLUTION_CONFIG = {
    maxMovePercent: 0.60,             // >60% move in 24h = resolution event
    movePeriodHours: 24,
} as const;

// Helper to get funded rules for a tier
export function getFundedRulesForTier(tier: keyof typeof FUNDED_RULES) {
    return FUNDED_RULES[tier];
}

// Helper to get exposure limit based on market volume
export function getExposureLimitByVolume(balance: number, volume: number): number {
    if (volume >= VOLUME_EXPOSURE_TIERS.high.minVolume) {
        return balance * 0.05;   // 5%
    }
    if (volume >= VOLUME_EXPOSURE_TIERS.medium.minVolume) {
        return balance * 0.025;  // 2.5%
    }
    if (volume >= VOLUME_EXPOSURE_TIERS.low.minVolume) {
        return balance * 0.005;  // 0.5%
    }
    return 0; // Block trading on <$100k volume markets
}

// Helper to get volume tier label
export function getVolumeTierLabel(volume: number): string {
    if (volume >= VOLUME_EXPOSURE_TIERS.high.minVolume) return "high volume (>$10M)";
    if (volume >= VOLUME_EXPOSURE_TIERS.medium.minVolume) return "medium volume ($1-10M)";
    if (volume >= VOLUME_EXPOSURE_TIERS.low.minVolume) return "low volume ($100k-1M)";
    return "insufficient volume (<$100k)";
}

export type FundedTier = keyof typeof FUNDED_RULES;
export type FundedRulesConfig = typeof FUNDED_RULES[FundedTier];

/**
 * Determine the funded tier based on starting balance.
 * Single source of truth — imported by evaluator.ts and payout-service.ts.
 */
export function getFundedTier(startingBalance: number): FundedTier {
    if (startingBalance >= 25000) return '25k';
    if (startingBalance >= 10000) return '10k';
    return '5k';
}
