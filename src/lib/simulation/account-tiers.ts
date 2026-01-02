/**
 * Multi-Tier Configuration
 * 
 * All 3 account sizes offered by the firm.
 */

import { FirmConfig } from './config';

export const ACCOUNT_TIERS: Record<string, FirmConfig> = {
    small: {
        challengeFee: 79,
        startingBalance: 5000,
        maxDrawdownPercent: 0.08,        // $400 static = 8%
        dailyLossLimitPercent: 0.04,     // $200 = 4%
        profitTargetPercent: 0.10,       // $500 = 10%
        payoutSplit: 0.80,
        payoutCap: 2.0,
        minTradingDays: 5,
        consistencyFlagPercent: 0.50,
        maxChallengeDays: 30,
    },

    medium: {
        challengeFee: 149,
        startingBalance: 10000,
        maxDrawdownPercent: 0.10,        // $1,000 static = 10%
        dailyLossLimitPercent: 0.05,     // $500 = 5%
        profitTargetPercent: 0.10,       // $1,000 = 10%
        payoutSplit: 0.80,
        payoutCap: 2.0,
        minTradingDays: 5,
        consistencyFlagPercent: 0.50,
        maxChallengeDays: 30,
    },

    large: {
        challengeFee: 299,
        startingBalance: 25000,
        maxDrawdownPercent: 0.10,        // $2,500 static = 10%
        dailyLossLimitPercent: 0.05,     // $1,250 = 5%
        profitTargetPercent: 0.12,       // $3,000 = 12%
        payoutSplit: 0.80,
        payoutCap: 2.0,
        minTradingDays: 5,
        consistencyFlagPercent: 0.50,
        maxChallengeDays: 30,
    },
};
