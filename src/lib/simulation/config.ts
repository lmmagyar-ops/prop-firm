/**
 * Business Survival Simulation - Configuration
 * 
 * Central configuration for prop firm rules and trader archetypes.
 * Adjust these parameters to test different business models.
 */

export interface FirmConfig {
    challengeFee: number;
    startingBalance: number;
    maxDrawdownPercent: number;
    dailyLossLimitPercent: number;
    profitTargetPercent: number;
    payoutSplit: number;
    payoutCap: number;
    minTradingDays: number;
    consistencyFlagPercent: number;
    maxChallengeDays: number;
}

export interface TraderArchetype {
    winRate: number;
    riskTolerance: number;
    avgTradesPerDay: number;
    positionSizeMultiplier: number;
}

/**
 * Current firm configuration (ACTUAL production values - $10k account tier)
 */
export const FIRM_CONFIG: FirmConfig = {
    challengeFee: 149,               // $10k account tier price
    startingBalance: 10000,
    maxDrawdownPercent: 0.10,        // 10% max drawdown (STATIC)
    dailyLossLimitPercent: 0.05,     // 5% daily loss limit
    profitTargetPercent: 0.10,       // 10% profit target
    payoutSplit: 0.80,               // 80% to trader, 20% to firm
    payoutCap: 2.0,                  // 2x starting balance max payout
    minTradingDays: 5,               // Minimum days to trade
    consistencyFlagPercent: 0.50,    // 50% single-day profit triggers flag
    maxChallengeDays: 30,            // 30 days to complete challenge
};

/**
 * Trader skill archetypes
 * 
 * Distribution:
 * - Skilled: 20-30% of trader population (experienced, consistent)
 * - Average: 40-50% of trader population (50/50 coin flip)
 * - Degen: 20-30% of trader population (high risk, blow up fast)
 */
export const TRADER_ARCHETYPES = {
    skilled: {
        winRate: 0.65,                 // 65% win rate
        riskTolerance: 0.02,           // 2% risk per trade
        avgTradesPerDay: 3,            // Conservative, selective
        positionSizeMultiplier: 0.8,   // Smaller positions
    } as TraderArchetype,

    average: {
        winRate: 0.50,                 // 50% win rate (coin flip)
        riskTolerance: 0.03,           // 3% risk per trade
        avgTradesPerDay: 5,            // Moderate activity
        positionSizeMultiplier: 1.0,   // Standard positions
    } as TraderArchetype,

    degen: {
        winRate: 0.35,                 // 35% win rate (poor strategy)
        riskTolerance: 0.08,           // 8% risk per trade (yolo)
        avgTradesPerDay: 8,            // Over-trading
        positionSizeMultiplier: 1.5,   // Oversized positions
    } as TraderArchetype,
};

/**
 * Default trader distribution for simulations
 */
export const DEFAULT_DISTRIBUTION = {
    skilled: 0.25,   // 25% skilled
    average: 0.50,   // 50% average
    degen: 0.25,     // 25% degen
};

/**
 * Market conditions
 */
export const MARKET_CONDITIONS = {
    bull: { volatility: 0.15, trend: 0.02 },      // Low vol, upward bias
    bear: { volatility: 0.15, trend: -0.02 },     // Low vol, downward bias
    sideways: { volatility: 0.10, trend: 0 },     // Low vol, no trend
    volatile: { volatility: 0.35, trend: 0 },     // High vol, no trend
};
