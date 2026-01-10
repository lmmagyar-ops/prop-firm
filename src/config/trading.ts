export const TRADING_CONFIG = {
    fees: {
        carryFeeRate: parseFloat(process.env.CARRY_FEE_RATE || "0.0005"),
        stalePeriodMs: process.env.NODE_ENV === "production"
            ? 24 * 60 * 60 * 1000  // 24 hours
            : 60 * 1000,            // 1 minute (demo)
        sweepIntervalMs: process.env.NODE_ENV === "production"
            ? 60 * 60 * 1000        // 1 hour
            : 10 * 1000             // 10 seconds (demo)
    },
    risk: {
        maxSlippagePercent: 0.05,
        priceFreshnessMs: 60000,
        enableStalenessCheck: true // Security hardening: always check price staleness
    },
    market: {
        orderBookPollIntervalMs: 2000,
        maxMarketsToTrack: 10
    }
} as const;
