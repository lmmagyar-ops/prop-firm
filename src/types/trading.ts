// Core Domain Types
export interface ChallengeRules {
    // Drawdown & Profit
    profitTarget: number;
    maxDrawdown: number;
    maxTotalDrawdownPercent: number;
    maxDailyDrawdownPercent: number;

    // Position Sizing
    maxPositionSizePercent: number;        // 0.05 (5% per market)
    maxCategoryExposurePercent: number;    // 0.10 (10% per category)
    lowVolumeThreshold: number;            // 10_000_000 ($10M)
    lowVolumeMaxPositionPercent: number;   // 0.025 (2.5%)

    // Liquidity
    maxVolumeImpactPercent: number;        // 0.10 (10% of 24h volume)
    minMarketVolume: number;               // 100_000 ($100k)
}

export interface Position {
    id: string;
    challengeId: string;
    marketId: string;
    direction: 'YES' | 'NO';
    sizeAmount: string;
    shares: string;
    entryPrice: string;
    currentPrice: string | null;
    status: 'OPEN' | 'CLOSED';
    pnl: string;
    lastFeeChargedAt: Date | null;
    feesPaid: string;
    openedAt: Date;
    closedAt: Date | null;
}

export interface Challenge {
    id: string;
    userId: string;
    phase: 'challenge' | 'verification' | 'funded';
    status: 'active' | 'failed' | 'passed';
    startingBalance: string;
    startOfDayBalance: string;
    currentBalance: string;
    highWaterMark: string | null;
    rulesConfig: ChallengeRules;
    startedAt: Date;
    endsAt: Date | null;
}

export interface TradeExecution {
    executedPrice: number;
    totalShares: number;
    slippagePercent: number;
    filled: boolean;
    reason?: string;
}

export interface RiskValidation {
    allowed: boolean;
    reason?: string;
}
