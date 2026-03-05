/**
 * Multi-Tier Configuration
 * 
 * All 3 account sizes offered by the firm.
 */

import { FirmConfig } from './config';

export const ACCOUNT_TIERS: Record<string, FirmConfig> = {
    small: {
        challengeFee: 99,
        startingBalance: 5000,
        maxDrawdownPercent: 0.06,        // $300 static = 6%
        dailyLossLimitPercent: 0.03,     // $150 = 3%
        profitTargetPercent: 0.10,       // $500 = 10%
        payoutSplit: 0.80,
        payoutCap: 2.0,
        minTradingDays: 5,
        consistencyFlagPercent: 0.50,
        maxChallengeDays: 30,
    },

    medium: {
        challengeFee: 189,
        startingBalance: 10000,
        maxDrawdownPercent: 0.08,        // $800 static = 8%
        dailyLossLimitPercent: 0.04,     // $400 = 4%
        profitTargetPercent: 0.12,       // $1,200 = 12%
        payoutSplit: 0.80,
        payoutCap: 2.0,
        minTradingDays: 5,
        consistencyFlagPercent: 0.50,
        maxChallengeDays: 30,
    },

    large: {
        challengeFee: 359,
        startingBalance: 25000,
        maxDrawdownPercent: 0.06,        // $1,500 static = 6%
        dailyLossLimitPercent: 0.03,     // $750 = 3%
        profitTargetPercent: 0.10,       // $2,500 = 10%
        payoutSplit: 0.80,
        payoutCap: 2.0,
        minTradingDays: 5,
        consistencyFlagPercent: 0.50,
        maxChallengeDays: 30,
    },
};
