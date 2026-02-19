/**
 * Price Consistency Regression Tests
 * 
 * REGRESSION: Feb 19 2026 — discount/validate/route.ts had stale TIER_PRICES
 * ({$99/$299/$599}) that didn't match actual checkout prices ({$79/$149/$299}).
 * 
 * Root cause: prices were hardcoded in 3+ files with no shared constant.
 * Fix: consolidated all pricing into config/plans.ts as single source of truth.
 * 
 * These tests verify:
 * 1. All derived lookup maps agree with each other
 * 2. admin-utils.ts resolves to the same prices
 * 3. Every tier in PLANS has a valid price > 0
 * 4. Size→Price→Size round-trips correctly
 */

import { describe, it, expect } from 'vitest';
import {
    PLANS,
    TIER_PRICE_BY_SIZE,
    TIER_PRICE_BY_ID,
    TIER_SIZE_BY_ID,
    getPriceForBalance
} from '@/config/plans';
import { TIER_PRICES, getTierPrice } from '@/lib/admin-utils';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INVARIANT 1: All lookup maps agree with PLANS (single source of truth)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Price Consistency: All Maps Agree With PLANS', () => {
    const plans = Object.values(PLANS);

    for (const plan of plans) {
        describe(`${plan.id} tier (size=${plan.size}, price=$${plan.price})`, () => {
            it('TIER_PRICE_BY_SIZE maps correctly', () => {
                expect(TIER_PRICE_BY_SIZE[plan.size]).toBe(plan.price);
            });

            it('TIER_PRICE_BY_ID maps correctly', () => {
                expect(TIER_PRICE_BY_ID[plan.id]).toBe(plan.price);
            });

            it('TIER_SIZE_BY_ID maps correctly', () => {
                expect(TIER_SIZE_BY_ID[plan.id]).toBe(String(plan.size));
            });

            it('getPriceForBalance resolves integer string', () => {
                expect(getPriceForBalance(String(plan.size))).toBe(plan.price);
            });

            it('getPriceForBalance resolves decimal string', () => {
                expect(getPriceForBalance(`${plan.size}.00`)).toBe(plan.price);
            });
        });
    }

    it('no plan has a zero or negative price', () => {
        for (const plan of plans) {
            expect(plan.price, `${plan.id} price must be > 0`).toBeGreaterThan(0);
        }
    });

    it('no plan has a zero or negative size', () => {
        for (const plan of plans) {
            expect(plan.size, `${plan.id} size must be > 0`).toBeGreaterThan(0);
        }
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INVARIANT 2: admin-utils delegates to the same source
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Price Consistency: admin-utils Matches PLANS', () => {
    const plans = Object.values(PLANS);

    for (const plan of plans) {
        it(`getTierPrice("${plan.size}") returns $${plan.price}`, () => {
            expect(getTierPrice(String(plan.size))).toBe(plan.price);
        });

        it(`TIER_PRICES[${plan.size}] returns $${plan.price}`, () => {
            expect(TIER_PRICES[plan.size]).toBe(plan.price);
        });
    }

    it('unknown balance returns 0 (fail closed)', () => {
        expect(getTierPrice('999999')).toBe(0);
        expect(getTierPrice('')).toBe(0);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INVARIANT 3: Round-trip consistency (the drift-detection test)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Price Consistency: Drift Detection', () => {
    it('every TIER_PRICE_BY_SIZE key exists in TIER_SIZE_BY_ID (and vice versa)', () => {
        const sizeFromPriceMap = Object.keys(TIER_PRICE_BY_SIZE).map(Number);
        const sizeFromIdMap = Object.values(TIER_SIZE_BY_ID).map(Number);

        expect(new Set(sizeFromPriceMap)).toEqual(new Set(sizeFromIdMap));
    });

    it('every TIER_PRICE_BY_ID key exists in TIER_SIZE_BY_ID (and vice versa)', () => {
        const idsFromPriceMap = Object.keys(TIER_PRICE_BY_ID);
        const idsFromSizeMap = Object.keys(TIER_SIZE_BY_ID);

        expect(new Set(idsFromPriceMap)).toEqual(new Set(idsFromSizeMap));
    });

    it('TIER_PRICE_BY_SIZE and TIER_PRICE_BY_ID resolve to identical price sets', () => {
        const pricesBySize = new Set(Object.values(TIER_PRICE_BY_SIZE));
        const pricesById = new Set(Object.values(TIER_PRICE_BY_ID));

        expect(pricesBySize).toEqual(pricesById);
    });
});
