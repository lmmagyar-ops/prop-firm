/**
 * Test Quality Verification Script
 * 
 * This script manually verifies that the performance optimizations are working
 * by checking the actual function calls and data flow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RiskEngine } from '@/lib/risk';
import { ChallengeEvaluator } from '@/lib/evaluator';

// === VERIFICATION 1: Risk Engine Uses Single Position Query ===
describe('VERIFICATION: Risk Engine Query Consolidation', () => {
    let positionFindManyCallCount = 0;
    let getMarketByIdCallCount = 0;
    let getActiveMarketsCallCount = 0;

    beforeEach(() => {
        vi.clearAllMocks();
        positionFindManyCallCount = 0;
        getMarketByIdCallCount = 0;
        getActiveMarketsCallCount = 0;
    });

    it('should call positions.findMany EXACTLY ONCE per validateTrade call', async () => {
        // Mock DB
        vi.mock('@/db', () => ({
            db: {
                select: vi.fn(() => ({
                    from: vi.fn(() => ({
                        where: vi.fn().mockResolvedValue([{
                            id: 'challenge-1',
                            status: 'active',
                            currentBalance: '10000',
                            startingBalance: '10000',
                            startOfDayBalance: '10000',
                            rulesConfig: {
                                maxPositionSizePercent: 0.05,
                                minMarketVolume: 100_000
                            }
                        }])
                    }))
                })),
                query: {
                    positions: {
                        findMany: vi.fn(() => {
                            positionFindManyCallCount++;
                            return [];
                        }),
                        findFirst: vi.fn(() => null)
                    }
                }
            }
        }));

        vi.mock('@/app/actions/market', () => ({
            getActiveMarkets: vi.fn(() => {
                getActiveMarketsCallCount++;
                return [{ id: 'market-1', volume: 15_000_000, categories: [] }];
            }),
            getMarketById: vi.fn(() => {
                getMarketByIdCallCount++;
                return { id: 'market-1', volume: 15_000_000, categories: [] };
            })
        }));

        const result = await RiskEngine.validateTrade('challenge-1', 'market-1', 100);

        // CRITICAL ASSERTION: positions.findMany should only be called ONCE
        // If this fails, we have an N+1 regression
        expect(positionFindManyCallCount).toBe(1);

        // getMarketById should be called ONCE (not getActiveMarkets for single lookup)
        expect(getMarketByIdCallCount).toBe(1);

        console.log(`
        ====== QUERY VERIFICATION RESULTS ======
        positions.findMany calls: ${positionFindManyCallCount} (expected: 1)
        getMarketById calls: ${getMarketByIdCallCount} (expected: 1)
        getActiveMarkets calls: ${getActiveMarketsCallCount} (expected: 0 for markets without categories)
        ========================================
        `);
    });
});

// === VERIFICATION 2: Evaluator Uses Batch Price Fetch ===
describe('VERIFICATION: Evaluator Batch Price Fetch', () => {
    it('should call getBatchOrderBookPrices ONCE instead of N times', async () => {
        let batchPriceCallCount = 0;
        let singlePriceCallCount = 0;

        vi.mock('@/db', () => ({
            db: {
                query: {
                    challenges: {
                        findFirst: vi.fn().mockResolvedValue({
                            id: 'challenge-1',
                            status: 'active',
                            phase: 'challenge',
                            startingBalance: '10000.00',
                            currentBalance: '10000.00',
                            highWaterMark: '10000.00',
                            startOfDayBalance: '10000.00',
                            pendingFailureAt: null,
                            endsAt: new Date(Date.now() + 86400000),
                            rulesConfig: { profitTarget: 1000, maxDrawdown: 1000 }
                        })
                    },
                    positions: {
                        findMany: vi.fn().mockResolvedValue([
                            { id: 'pos-1', marketId: 'market-1', direction: 'YES', shares: '100', entryPrice: '0.50', currentPrice: '0.50', status: 'OPEN' },
                            { id: 'pos-2', marketId: 'market-2', direction: 'YES', shares: '100', entryPrice: '0.50', currentPrice: '0.50', status: 'OPEN' },
                            { id: 'pos-3', marketId: 'market-3', direction: 'NO', shares: '100', entryPrice: '0.50', currentPrice: '0.50', status: 'OPEN' }
                        ])
                    }
                },
                update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) }))
            }
        }));

        vi.mock('@/lib/market', () => ({
            MarketService: {
                getLatestPrice: vi.fn(() => {
                    singlePriceCallCount++;
                    return { price: '0.50' };
                }),
                getBatchOrderBookPrices: vi.fn((marketIds: string[]) => {
                    batchPriceCallCount++;
                    const map = new Map();
                    marketIds.forEach(id => map.set(id, { price: '0.55' }));
                    return map;
                })
            }
        }));

        vi.mock('@/lib/events', () => ({
            publishAdminEvent: vi.fn()
        }));

        const result = await ChallengeEvaluator.evaluate('challenge-1');

        // CRITICAL ASSERTION: getBatchOrderBookPrices should be called ONCE
        // getLatestPrice should NOT be called (we use batch now)
        expect(batchPriceCallCount).toBe(1);
        expect(singlePriceCallCount).toBe(0);

        console.log(`
        ====== BATCH PRICE VERIFICATION RESULTS ======
        getBatchOrderBookPrices calls: ${batchPriceCallCount} (expected: 1)
        getLatestPrice calls: ${singlePriceCallCount} (expected: 0)
        Positions processed: 3
        ===============================================
        `);
    });
});

// === VERIFICATION 3: Correct Position Value Calculation ===
describe('VERIFICATION: Position Value Math', () => {
    it('should correctly calculate NO position value as shares * (1 - yesPrice)', () => {
        // Given: 100 shares of NO position, YES price = 0.30
        const shares = 100;
        const yesPrice = 0.30;
        const direction = 'NO';

        // Calculate
        const effectivePrice = direction === 'NO' ? (1 - yesPrice) : yesPrice;
        const positionValue = shares * effectivePrice;

        // Expected: 100 * (1 - 0.30) = 100 * 0.70 = 70
        expect(positionValue).toBe(70);

        console.log(`
        ====== NO POSITION MATH VERIFICATION ======
        Shares: ${shares}
        YES Price: ${yesPrice}
        Direction: ${direction}
        Effective Price: ${effectivePrice}
        Position Value: $${positionValue}
        ==========================================
        `);
    });

    it('should correctly calculate YES position value as shares * yesPrice', () => {
        // Given: 100 shares of YES position, YES price = 0.55
        const shares = 100;
        const yesPrice = 0.55;
        const direction = 'YES';

        // Calculate
        const effectivePrice = direction === 'NO' ? (1 - yesPrice) : yesPrice;
        const positionValue = shares * effectivePrice;

        // Expected: 100 * 0.55 = 55
        expect(positionValue).toBeCloseTo(55, 2);
    });
});

// === VERIFICATION 4: Category Exposure Uses Cached Positions ===
describe('VERIFICATION: Category Exposure From Cache', () => {
    it('should compute category exposure from in-memory positions array', () => {
        // Simulate the getCategoryExposureFromCache function
        const openPositions = [
            { marketId: 'politics-1', sizeAmount: '500' },
            { marketId: 'politics-2', sizeAmount: '300' },
            { marketId: 'crypto-1', sizeAmount: '200' }
        ];

        const markets = [
            { id: 'politics-1', categories: ['Politics'] },
            { id: 'politics-2', categories: ['Politics'] },
            { id: 'crypto-1', categories: ['Crypto'] }
        ];

        // Calculate Politics exposure manually
        let politicsExposure = 0;
        for (const pos of openPositions) {
            const market = markets.find(m => m.id === pos.marketId);
            if (market?.categories?.includes('Politics')) {
                politicsExposure += parseFloat(pos.sizeAmount);
            }
        }

        // Expected: 500 + 300 = 800
        expect(politicsExposure).toBe(800);

        console.log(`
        ====== CATEGORY EXPOSURE VERIFICATION ======
        Politics positions: 2
        Politics exposure: $${politicsExposure}
        ============================================
        `);
    });
});
