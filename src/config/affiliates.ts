/**
 * Affiliate Program Configuration — SINGLE SOURCE OF TRUTH
 *
 * All commission rates, earning caps, and tier definitions live here.
 * API routes import from this file — never hardcode rates.
 *
 * Same pattern as config/plans.ts for tier pricing.
 */

export const AFFILIATE_TIERS = {
    1: {
        label: "Starter",
        commissionRate: 10,       // 10% of purchase price
        lifetimeValueRate: 0,     // No LTV bonus
        monthlyEarningCap: 500,   // $500/mo cap
        autoApproved: true,
    },
    2: {
        label: "Partner",
        commissionRate: 15,       // 15% of purchase price
        lifetimeValueRate: 5,     // 5% on repeat purchases
        monthlyEarningCap: null,  // Uncapped
        autoApproved: false,      // Requires admin review
    },
    3: {
        label: "Elite",
        commissionRate: null,     // Custom — set per affiliate by admin
        lifetimeValueRate: null,
        monthlyEarningCap: null,
        autoApproved: false,
    },
} as const;

/** Attribution window for referral cookies (seconds) */
export const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

/** Cookie name for referral attribution */
export const REFERRAL_COOKIE_NAME = "ref";

/** Get tier config by tier number, with safe fallback */
export function getAffiliateTierConfig(tier: number) {
    return AFFILIATE_TIERS[tier as keyof typeof AFFILIATE_TIERS] ?? AFFILIATE_TIERS[1];
}
