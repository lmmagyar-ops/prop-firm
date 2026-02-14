import { describe, it, expect } from 'vitest';
import { isValidMarketPrice } from '@/lib/price-validation';

describe('isValidMarketPrice', () => {
    // ── Valid prices ───────────────────────────────────────────
    it.each([
        [0, 'resolved NO (YES side lost)'],
        [0.01, 'near-resolution low'],
        [0.25, 'low active'],
        [0.5, 'mid active'],
        [0.75, 'high active'],
        [0.99, 'near-resolution high'],
        [1, 'resolved YES (YES side won)'],
    ])('accepts %s (%s)', (price) => {
        expect(isValidMarketPrice(price)).toBe(true);
    });

    // ── Invalid prices ─────────────────────────────────────────
    it.each([
        [-1, 'negative'],
        [-0.01, 'slightly negative'],
        [1.01, 'slightly over 1'],
        [2, 'way over 1'],
        [NaN, 'NaN'],
        [Infinity, 'Infinity'],
        [-Infinity, '-Infinity'],
    ])('rejects %s (%s)', (price) => {
        expect(isValidMarketPrice(price)).toBe(false);
    });

    // ── Demo-leak invariant ────────────────────────────────────
    // This test exists to document that 0.55 IS a valid price.
    // The bug was never that 0.55 is invalid — it's that the
    // system fabricated 0.55 when it had no data. That path
    // is now deleted (getDemoPrice removed).
    it('accepts 0.55 as a valid price (not a special value)', () => {
        expect(isValidMarketPrice(0.55)).toBe(true);
    });
});
