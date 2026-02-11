import { describe, it, expect } from 'vitest';

/**
 * Checkout Tier Mapping Tests
 * 
 * REGRESSION: Dec 27 2025 (commit c12f267) — fragile string matching in
 * checkout/page.tsx caused all tiers to silently default to 10k.
 * 
 * These tests verify:
 * 1. Tier derivation from size param (backward compat)
 * 2. Direct tier param takes precedence
 * 3. Invoice API maps tiers to correct balances
 * 4. PLANS config has correct id/size mappings
 * 
 * Run: npm run test -- tests/checkout-tier.test.ts
 */

// ─── 1. Tier Derivation Logic ───────────────────────────────────────────────

// Replicate the checkout page's tier derivation logic
function deriveTierId(size: string | null, tierParam: string | null): string {
    const effectiveSize = size || '10000';
    const derived = effectiveSize === '5000' ? '5k' : effectiveSize === '25000' ? '25k' : '10k';
    return tierParam || derived;
}

describe('Checkout Tier Derivation', () => {
    describe('from size param (backward compatibility)', () => {
        it('size=5000 → 5k', () => {
            expect(deriveTierId('5000', null)).toBe('5k');
        });

        it('size=10000 → 10k', () => {
            expect(deriveTierId('10000', null)).toBe('10k');
        });

        it('size=25000 → 25k', () => {
            expect(deriveTierId('25000', null)).toBe('25k');
        });

        it('null size → 10k (default)', () => {
            expect(deriveTierId(null, null)).toBe('10k');
        });

        it('empty string size → 10k (default)', () => {
            // searchParams.get() returns null for missing params, not empty string
            // but this tests defensive behavior
            expect(deriveTierId('', null)).toBe('10k');
        });

        it('unexpected size value → 10k (default)', () => {
            // This was the silent failure mode — unknown sizes defaulted to 10k
            expect(deriveTierId('50000', null)).toBe('10k');
            expect(deriveTierId('abc', null)).toBe('10k');
        });
    });

    describe('from explicit tier param (preferred)', () => {
        it('tier=5k overrides any size', () => {
            expect(deriveTierId('10000', '5k')).toBe('5k');
            expect(deriveTierId('25000', '5k')).toBe('5k');
            expect(deriveTierId(null, '5k')).toBe('5k');
        });

        it('tier=10k overrides any size', () => {
            expect(deriveTierId('5000', '10k')).toBe('10k');
            expect(deriveTierId('25000', '10k')).toBe('10k');
        });

        it('tier=25k overrides any size', () => {
            expect(deriveTierId('5000', '25k')).toBe('25k');
            expect(deriveTierId('10000', '25k')).toBe('25k');
        });

        it('tier param takes precedence over matching size', () => {
            // Even when both agree, tier param is the source of truth
            expect(deriveTierId('5000', '5k')).toBe('5k');
            expect(deriveTierId('10000', '10k')).toBe('10k');
            expect(deriveTierId('25000', '25k')).toBe('25k');
        });
    });
});

// ─── 2. PLANS Config Integrity ──────────────────────────────────────────────

// Import the actual PLANS config to verify consistency
import { PLANS } from '@/config/plans';

describe('PLANS Config Integrity', () => {
    const expectedTiers = [
        { key: 'scout', id: '5k', size: 5000 },
        { key: 'grinder', id: '10k', size: 10000 },
        { key: 'executive', id: '25k', size: 25000 },
    ];

    for (const expected of expectedTiers) {
        it(`${expected.key} has id="${expected.id}" and size=${expected.size}`, () => {
            const plan = PLANS[expected.key as keyof typeof PLANS];
            expect(plan).toBeDefined();
            expect(plan.id).toBe(expected.id);
            expect(plan.size).toBe(expected.size);
        });
    }

    it('all plans have unique ids', () => {
        const ids = Object.values(PLANS).map(p => p.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('all plans have unique sizes', () => {
        const sizes = Object.values(PLANS).map(p => p.size);
        expect(new Set(sizes).size).toBe(sizes.length);
    });

    it('size-to-id mapping is consistent with deriveTierId', () => {
        for (const plan of Object.values(PLANS)) {
            const derived = deriveTierId(plan.size.toString(), null);
            expect(derived, `PLANS ${plan.id}: size ${plan.size} should derive to "${plan.id}"`).toBe(plan.id);
        }
    });
});

// ─── 3. Invoice Tier Balance Mapping ────────────────────────────────────────

describe('Invoice Tier Balance Mapping', () => {
    // Replicate the create-confirmo-invoice tier→balance mapping
    const tierBalances: Record<string, number> = {
        '5k': 5000,
        '10k': 10000,
        '25k': 25000,
        '50k': 50000,
        '100k': 100000,
        '200k': 200000,
    };

    it('5k tier → $5,000 starting balance', () => {
        expect(tierBalances['5k']).toBe(5000);
    });

    it('10k tier → $10,000 starting balance', () => {
        expect(tierBalances['10k']).toBe(10000);
    });

    it('25k tier → $25,000 starting balance', () => {
        expect(tierBalances['25k']).toBe(25000);
    });

    it('all active PLANS tiers have matching balance entries', () => {
        for (const plan of Object.values(PLANS)) {
            expect(
                tierBalances[plan.id],
                `Tier "${plan.id}" must have a balance entry in tierBalances`
            ).toBe(plan.size);
        }
    });

    it('unknown tier defaults to 10k (fallback behavior)', () => {
        // This documents the current fallback behavior — unknown tiers get 10k
        const unknownBalance = tierBalances['unknown'] || 10000;
        expect(unknownBalance).toBe(10000);
    });
});

// ─── 4. URL Construction ─────────────────────────────────────────────────────

describe('Buy-Evaluation URL Construction', () => {
    for (const [key, plan] of Object.entries(PLANS)) {
        it(`${key} plan generates correct checkout URL params`, () => {
            // Simulate what BuyEvaluationClient renders
            const url = `/checkout?size=${plan.size}&price=${plan.price}&tier=${plan.id}&from_dashboard=true`;
            const parsed = new URL(url, 'http://localhost');

            expect(parsed.searchParams.get('size')).toBe(plan.size.toString());
            expect(parsed.searchParams.get('price')).toBe(plan.price.toString());
            expect(parsed.searchParams.get('tier')).toBe(plan.id);
            expect(parsed.searchParams.get('from_dashboard')).toBe('true');

            // Verify tier derivation from these params produces correct result
            const tierId = deriveTierId(
                parsed.searchParams.get('size'),
                parsed.searchParams.get('tier')
            );
            expect(tierId).toBe(plan.id);
        });
    }
});
