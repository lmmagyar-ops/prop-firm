/**
 * Shared admin utilities for consistent logic across endpoints
 */
import { TIER_PRICE_BY_SIZE, getPriceForBalance } from "@/config/plans";

/**
 * Maps tier starting balance to actual purchase price.
 * Re-exported from config/plans.ts — SINGLE SOURCE OF TRUTH.
 */
export const TIER_PRICES = TIER_PRICE_BY_SIZE;

/**
 * Get the purchase price for a given starting balance
 */
export function getTierPrice(startingBalance: string): number {
    return getPriceForBalance(startingBalance);
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
