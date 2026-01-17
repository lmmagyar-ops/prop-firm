/**
 * Shared admin utilities for consistent logic across endpoints
 */

/**
 * Maps tier starting balance to actual purchase price
 * Starting balance represents the virtual trading balance
 * Purchase price is what the customer actually paid
 */
export const TIER_PRICES: Record<string, number> = {
    "5000": 79,
    "5000.00": 79,
    "10000": 149,
    "10000.00": 149,
    "25000": 299,
    "25000.00": 299,
};

/**
 * Get the purchase price for a given starting balance
 */
export function getTierPrice(startingBalance: string): number {
    return TIER_PRICES[startingBalance] || 0;
}

/**
 * Risk exposure cap in dollars
 */
export const EXPOSURE_CAP = 2_000_000;

/**
 * VaR multiplier (5% of total exposure)
 */
export const VAR_MULTIPLIER = 0.05;

/**
 * Hedged ratio estimate (fee coverage)
 */
export const HEDGE_RATIO = 0.1;
