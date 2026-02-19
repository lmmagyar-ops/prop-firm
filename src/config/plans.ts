
export const PLANS = {
    scout: {
        id: "5k",
        label: "",
        size: 5000,
        price: 79,
        profitTarget: 500, // 10%
        dailyLossPercent: 4,
        maxDrawdownPercent: 8,
        payoutCap: "Unlimited",
        features: ["Manage $5,000", "Up to 90% Profit Split", "Instant Funding"],
        isPopular: false
    },
    grinder: {
        id: "10k",
        label: "",
        size: 10000,
        price: 149,
        profitTarget: 1000, // 10%
        dailyLossPercent: 5,
        maxDrawdownPercent: 10,
        payoutCap: "Unlimited",
        features: ["Manage $10,000", "Up to 90% Profit Split", "Best Value"],
        isPopular: true
    },
    executive: {
        id: "25k",
        label: "",
        size: 25000,
        price: 299,
        profitTarget: 3000, // 12%
        dailyLossPercent: 5,
        maxDrawdownPercent: 10,
        payoutCap: "$2,000 (1st Payout)",
        features: ["Manage $25,000", "Up to 90% Profit Split", "Max 1st Payout: $2,000"],
        isPopular: false
    },
    /*
    elite: {
        id: "50k",
        label: "Elite",
        size: 50000,
        price: 399,
        profitTarget: 4000,
        features: ["Manage $50,000", "90% Profit Split", "Expert Tier"]
    },
    legend: {
        id: "100k",
        label: "Legend",
        size: 100000,
        price: 799,
        profitTarget: 8000,
        features: ["Manage $100,000", "90% Profit Split", "Maximum Capital"]
    }
    */
} as const;

export const CHALLENGE_RULES = {
    profitSplit: "80%", // Base split, marketing says "Up to 90%"
    duration: "60 Days",
    minTradingDays: "5 Days",
} as const;

export type PlanId = keyof typeof PLANS;

/**
 * Derived lookup maps — SINGLE SOURCE OF TRUTH for tier pricing.
 * All other files MUST import from here instead of hardcoding prices.
 */
const planValues = Object.values(PLANS);

/** Map starting balance (number) → purchase price. E.g. 5000 → 79 */
export const TIER_PRICE_BY_SIZE: Record<number, number> = Object.fromEntries(
    planValues.map(p => [p.size, p.price])
);

/** Map tier ID string → purchase price. E.g. "5k" → 79 */
export const TIER_PRICE_BY_ID: Record<string, number> = Object.fromEntries(
    planValues.map(p => [p.id, p.price])
);

/** Map tier ID string → starting balance string. E.g. "5k" → "5000" */
export const TIER_SIZE_BY_ID: Record<string, string> = Object.fromEntries(
    planValues.map(p => [p.id, String(p.size)])
);

/** Get purchase price for a starting balance string (handles "5000" and "5000.00") */
export function getPriceForBalance(startingBalance: string): number {
    const normalized = parseFloat(startingBalance);
    return TIER_PRICE_BY_SIZE[normalized] || 0;
}
