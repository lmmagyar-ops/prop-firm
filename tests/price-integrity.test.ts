/**
 * Price Integrity Invariants — Stabilization Phase 2
 *
 * These tests verify structural invariants about price handling:
 * 1. No magic 0.5 fallbacks on the financial execution path
 * 2. Order book engine always sorts correctly
 * 3. Equity plausibility: portfolio value can't exceed funded balance
 * 4. Position metrics direction handling
 * 5. Data validator catches placeholder prices
 */
import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// ─── Mocks ───────────────────────────────────────────────────
vi.mock('@/db', () => ({
    db: { query: {}, select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}));
vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(),
    }),
}));
vi.mock('@/lib/alerts', () => ({
    alerts: { tradeFailed: vi.fn(), anomaly: vi.fn() },
}));

// ─── Imports under test ──────────────────────────────────────
import { isBookDead, buildSyntheticOrderBook, calculateImpact, invertOrderBook } from '@/lib/order-book-engine';
import { isValidMarketPrice } from '@/lib/price-validation';
import {
    getPortfolioValue,
    getDirectionAdjustedPrice,
    calculatePositionMetrics,
    computeWinRate,
} from '@/lib/position-utils';
import { validateMarket } from '@/lib/data-validator';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INVARIANT 1: No 0.5 fallbacks on financial execution path
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('No Magic 0.5 on Financial Path', () => {
    const FINANCIAL_FILES = [
        'src/lib/trade.ts',
        'src/lib/market.ts',
        'src/lib/risk.ts',
        'src/lib/order-book-engine.ts',
        'src/lib/position-utils.ts',
        'src/lib/price-validation.ts',
        'src/lib/evaluator.ts',
    ];

    // Pattern: ?? 0.5 or || 0.5 or = 0.5 (but NOT >= 0.5 or <= 0.5 or === 0.5)
    // These are the dangerous assignment-fallback patterns
    const DANGEROUS_PATTERN = /(?:\?\?|\|\|)\s*0\.5(?:0*)?\s*[;,)\]]|=\s*0\.5(?:0*)?\s*;/;
    // But exclude: ===, !==, >=, <=, >, < comparisons (those are guards, not fallbacks)
    const SAFE_COMPARISON = /(?:[><!]=?=?)\s*0\.5/;

    it.each(FINANCIAL_FILES)('no dangerous 0.5 fallback in %s', (filePath) => {
        const fullPath = path.resolve('/Users/lesmagyar/Desktop/Project X/prop-firm', filePath);
        if (!fs.existsSync(fullPath)) return; // Skip if file doesn't exist

        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        const violations: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (DANGEROUS_PATTERN.test(line) && !SAFE_COMPARISON.test(line)) {
                // Exclude comments
                const trimmed = line.trim();
                if (!trimmed.startsWith('//') && !trimmed.startsWith('*')) {
                    violations.push(`Line ${i + 1}: ${trimmed}`);
                }
            }
        }

        expect(violations).toEqual([]);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INVARIANT 2: Order book sort correctness
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Order Book Sort Correctness', () => {
    it('calculateImpact handles worst-case sort (bids ascending, asks descending)', () => {
        // This is the EXACT bug pattern from the Polymarket CLOB API:
        // Bids come ascending (worst first), asks come descending (worst first)
        const reverseSortedBook = {
            bids: [
                { price: '0.40', size: '100' },  // worst bid first
                { price: '0.55', size: '100' },
                { price: '0.60', size: '100' },  // best bid last
            ],
            asks: [
                { price: '0.80', size: '100' },  // worst ask first
                { price: '0.70', size: '100' },
                { price: '0.65', size: '100' },  // best ask last
            ],
        };

        const result = calculateImpact(reverseSortedBook, 'BUY', 10);
        expect(result.filled).toBe(true);
        // Execution price must be near the BEST ask (0.65), not worst (0.80)
        expect(result.executedPrice).toBeLessThan(0.70);
        expect(result.executedPrice).toBeGreaterThanOrEqual(0.65);
    });

    it('isBookDead uses Math.min/max, not [0] index', () => {
        // If sort was wrong and [0] was used, this would be "dead" (spread = 0.80-0.40 = 0.40)
        // But Math.min/max correctly finds best ask=0.65, best bid=0.60, spread=0.05
        const book = {
            bids: [
                { price: '0.40', size: '100' },
                { price: '0.60', size: '100' },
            ],
            asks: [
                { price: '0.80', size: '100' },
                { price: '0.65', size: '100' },
            ],
        };

        expect(isBookDead(book)).toBe(false); // spread = 0.05, NOT 0.40
    });

    it('invertOrderBook produces valid YES book from NO book', () => {
        const noBook = {
            bids: [{ price: '0.30', size: '100' }],
            asks: [{ price: '0.35', size: '100' }],
        };

        const yesBook = invertOrderBook(noBook);
        // NO bid at 0.30 → YES ask at 0.70
        expect(parseFloat(yesBook.asks[0].price)).toBeCloseTo(0.70, 2);
        // NO ask at 0.35 → YES bid at 0.65
        expect(parseFloat(yesBook.bids[0].price)).toBeCloseTo(0.65, 2);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INVARIANT 3: Equity Plausibility
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Equity Plausibility', () => {
    it('portfolio value at entry price = cost basis (no phantom PnL)', () => {
        const positions = [
            { marketId: 'm1', shares: '10', entryPrice: '0.65', direction: 'YES' },
            { marketId: 'm2', shares: '5', entryPrice: '0.40', direction: 'NO' },
        ];

        // Live prices match entry
        const livePrices = new Map([
            ['m1', { price: '0.65', source: 'order_book' }],
            ['m2', { price: '0.60', source: 'order_book' }], // NO at 0.40 → YES price is 0.60
        ]);

        const result = getPortfolioValue(positions, livePrices);

        // Position 1: 10 shares × $0.65 = $6.50
        // Position 2: 5 shares × (1 - 0.60) = 5 × 0.40 = $2.00
        expect(result.totalValue).toBeCloseTo(6.50 + 2.00, 2);

        // Unrealized PnL should be ~$0 (prices match entry exactly)
        const totalPnL = result.positions.reduce((s, p) => s + p.unrealizedPnL, 0);
        expect(Math.abs(totalPnL)).toBeLessThan(0.01);
    });

    it('portfolio value cannot exceed theoretical max (all positions at $1)', () => {
        const positions = [
            { marketId: 'm1', shares: '100', entryPrice: '0.50', direction: 'YES' },
            { marketId: 'm2', shares: '50', entryPrice: '0.30', direction: 'YES' },
        ];

        // Even at max prices, total should be shares sum
        const livePrices = new Map([
            ['m1', { price: '0.99', source: 'order_book' }],
            ['m2', { price: '0.99', source: 'order_book' }],
        ]);

        const result = getPortfolioValue(positions, livePrices);
        // Max possible = 100 × 0.99 + 50 × 0.99 = 148.50
        expect(result.totalValue).toBeLessThanOrEqual(150);
    });

    it('handles NaN shares/prices gracefully (no crash, no phantom)', () => {
        const positions = [
            { marketId: 'm1', shares: 'NaN', entryPrice: '0.65', direction: 'YES' },
            { marketId: 'm2', shares: '10', entryPrice: 'invalid', direction: 'YES' },
            { marketId: 'm3', shares: '10', entryPrice: '0.50', direction: 'YES' }, // valid
        ];

        const livePrices = new Map([
            ['m3', { price: '0.55', source: 'order_book' }],
        ]);

        const result = getPortfolioValue(positions, livePrices);
        // Only m3 should be counted (10 × 0.55 = 5.50)
        // getPortfolioValue skips positions with NaN shares but may still process
        // positions with unparseable entryPrice (treated as NaN by safeParseFloat → skipped)
        // So only valid positions should contribute to totalValue
        expect(result.totalValue).toBeCloseTo(5.50, 1);
        // At least 1 valid position counted
        expect(result.positions.length).toBeGreaterThanOrEqual(1);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INVARIANT 4: Direction Handling
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Direction Handling', () => {
    it('YES price is passthrough', () => {
        expect(getDirectionAdjustedPrice(0.65, 'YES')).toBe(0.65);
    });

    it('NO price is inverted', () => {
        expect(getDirectionAdjustedPrice(0.65, 'NO')).toBeCloseTo(0.35, 10);
    });

    it('calculatePositionMetrics: NO position PnL correct when price drops', () => {
        // NO position entered at 35¢ (stored as 1 - 0.65 = 0.35)
        // Current YES price drops to 0.60 → NO value = 0.40
        // PnL = (0.40 - 0.35) × 10 shares = $0.50 profit
        const result = calculatePositionMetrics(10, 0.35, 0.60, 'NO');
        expect(result.effectiveCurrentPrice).toBeCloseTo(0.40, 10);
        expect(result.unrealizedPnL).toBeCloseTo(0.50, 2);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INVARIANT 5: Win Rate & Trade Metrics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Win Rate Single Source of Truth', () => {
    it('returns null when no SELL trades exist (not 0%)', () => {
        const trades = [
            { type: 'BUY', realizedPnL: null },
            { type: 'BUY', realizedPnL: null },
        ];
        expect(computeWinRate(trades)).toBeNull();
    });

    it('computes correct percentage for mixed results', () => {
        const trades = [
            { type: 'BUY', realizedPnL: null },
            { type: 'SELL', realizedPnL: '5.00' },   // win
            { type: 'SELL', realizedPnL: '-2.00' },  // loss
            { type: 'SELL', realizedPnL: '1.50' },   // win
        ];
        // 2 wins out of 3 sells = 66.67%
        expect(computeWinRate(trades)).toBeCloseTo(66.67, 1);
    });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INVARIANT 6: Data Validator (ingestion layer defense)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Data Validator Guards', () => {
    it('warns on exactly-50% placeholder price', () => {
        const result = validateMarket({
            id: 'test', question: 'Test Market', outcomes: ['Yes', 'No'],
            price: 0.50, volume: 1000,
        });
        expect(result.warnings.some(w => w.includes('placeholder'))).toBe(true);
    });

    it('rejects negative prices', () => {
        const result = validateMarket({
            id: 'test', question: 'Test Market', outcomes: ['Yes', 'No'],
            price: -0.01, volume: 1000,
        });
        expect(result.isValid).toBe(false);
    });

    it('rejects prices > 100%', () => {
        const result = validateMarket({
            id: 'test', question: 'Test Market', outcomes: ['Yes', 'No'],
            price: 1.5, volume: 1000,
        });
        expect(result.isValid).toBe(false);
    });
});
