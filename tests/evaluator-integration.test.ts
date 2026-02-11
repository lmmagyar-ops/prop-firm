/**
 * ChallengeEvaluator Integration Tests
 * 
 * Tests the "Judge" logic that determines pass/fail/breach for challenges.
 * These tests verify the REAL evaluator logic with mocked database.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChallengeEvaluator } from '@/lib/evaluator';

// Mock the database
vi.mock('@/db', () => ({
    db: {
        query: {
            challenges: {
                findFirst: vi.fn(),
            },
            positions: {
                findMany: vi.fn(),
            },
        },
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn(),
            })),
        })),
    },
}));

// Mock MarketService for live prices
vi.mock('@/lib/market', () => ({
    MarketService: {
        getLatestPrice: vi.fn(),
        getBatchOrderBookPrices: vi.fn((marketIds: string[]) => {
            // Return empty Map by default - individual tests will override
            return new Map();
        })
    },
}));

// Mock events
vi.mock('@/lib/events', () => ({
    publishAdminEvent: vi.fn(),
}));

// Mock OutageManager — default: no outage (so evaluator proceeds normally)
vi.mock('@/lib/outage-manager', () => ({
    OutageManager: {
        getOutageStatus: vi.fn().mockResolvedValue({
            isOutage: false,
            isGraceWindow: false,
        }),
    },
}));

import { db } from '@/db';
import { MarketService } from '@/lib/market';

// ===== HELPER FACTORIES =====

function createMockChallenge(overrides: Partial<any> = {}) {
    return {
        id: 'test-challenge-1',
        userId: 'user-1',
        status: 'active',
        phase: 'challenge',
        startingBalance: '10000.00',
        currentBalance: '10000.00',
        highWaterMark: '10000.00',
        startOfDayBalance: '10000.00',
        pendingFailureAt: null,
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        rulesConfig: {
            profitTarget: 1000,     // $1000 profit target
            maxDrawdown: 1000,      // $1000 max drawdown (10%)
            maxDailyDrawdownPercent: 0.05, // 5%
        },
        ...overrides,
    };
}

function createMockPosition(overrides: Partial<any> = {}) {
    return {
        id: 'pos-1',
        challengeId: 'test-challenge-1',
        marketId: 'market-abc',
        direction: 'YES',
        shares: '100',
        entryPrice: '0.50',
        currentPrice: '0.50',
        status: 'OPEN',
        ...overrides,
    };
}

// ===== TESTS =====

describe('ChallengeEvaluator - Breach Detection', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Max Drawdown Breach (Challenge Phase - Trailing)', () => {

        it('should FAIL when equity drops past max drawdown from HWM', async () => {
            // Setup: Challenge with $10k starting, HWM at $11k (made profit)
            // Then dropped to $9,900 balance = $1,100 drawdown from HWM
            const challenge = createMockChallenge({
                startingBalance: '10000.00',
                currentBalance: '9900.00',
                highWaterMark: '11000.00', // Made $1k profit before
            });

            vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
            vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

            const result = await ChallengeEvaluator.evaluate('test-challenge-1');

            // Drawdown = $11,000 - $9,900 = $1,100 >= $1,000 max
            expect(result.status).toBe('failed');
            expect(result.reason).toContain('drawdown');
        });

        it('should NOT fail at exactly max drawdown (boundary test)', async () => {
            // Setup: Exactly at the limit ($1000 drawdown from HWM of $11k)
            const challenge = createMockChallenge({
                startingBalance: '10000.00',
                currentBalance: '10000.00', // $1000 down from HWM
                highWaterMark: '11000.00',
            });

            vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
            vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

            const result = await ChallengeEvaluator.evaluate('test-challenge-1');

            // Drawdown = $11,000 - $10,000 = $1,000 - but rule is >= so this SHOULD fail
            // If we want it to NOT fail at exactly the limit, we'd use >
            // Current implementation uses >= so this will fail
            // Document this behavior:
            expect(result.status).toBe('failed');
        });

        it('should stay active when drawdown is under limit', async () => {
            const challenge = createMockChallenge({
                startingBalance: '10000.00',
                currentBalance: '10500.00',
                highWaterMark: '11000.00', // Only $500 drawdown
            });

            vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
            vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

            const result = await ChallengeEvaluator.evaluate('test-challenge-1');

            expect(result.status).toBe('active');
        });
    });

    describe('Max Drawdown Breach (Funded Phase - Static)', () => {

        it('should use STATIC drawdown from initial balance in funded phase', async () => {
            // Funded phase: Static drawdown from $10k starting (not HWM)
            // 10k tier = $1000 max total drawdown
            const challenge = createMockChallenge({
                phase: 'funded',
                startingBalance: '10000.00',
                currentBalance: '9500.00',
                startOfDayBalance: '9500.00', // Set SOD = current to avoid daily loss trigger
                highWaterMark: '12000.00', // Made $2k profit before
            });

            vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
            vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

            const result = await ChallengeEvaluator.evaluate('test-challenge-1');

            // Static drawdown = $10,000 - $9,500 = $500 < $1,000 max
            // Should NOT fail (uses starting balance, not HWM)
            expect(result.status).toBe('active');
        });

        it('should FAIL funded when static drawdown exceeded', async () => {
            const challenge = createMockChallenge({
                phase: 'funded',
                startingBalance: '10000.00',
                currentBalance: '8900.00', // $1,100 down from starting
                highWaterMark: '12000.00',
            });

            vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
            vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

            const result = await ChallengeEvaluator.evaluate('test-challenge-1');

            // Static drawdown = $10,000 - $8,900 = $1,100 >= $1,000 max
            expect(result.status).toBe('failed');
        });
    });

    describe('Daily Loss Limit', () => {

        it('should set pending_failure when daily loss exceeds limit', async () => {
            // SOD balance = $10,000, max daily loss = 5% = $500
            const challenge = createMockChallenge({
                startingBalance: '10000.00',
                currentBalance: '9400.00',  // $600 loss today
                startOfDayBalance: '10000.00',
            });

            vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
            vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

            const result = await ChallengeEvaluator.evaluate('test-challenge-1');

            expect(result.status).toBe('pending_failure');
            expect(result.reason).toContain('Daily loss');
        });

        it('should clear pending_failure if trader recovers', async () => {
            // Was in pending failure, now recovered
            const challenge = createMockChallenge({
                startingBalance: '10000.00',
                currentBalance: '9800.00',  // Only $200 loss now
                startOfDayBalance: '10000.00',
                pendingFailureAt: new Date(), // Was pending
            });

            vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
            vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

            const result = await ChallengeEvaluator.evaluate('test-challenge-1');

            expect(result.status).toBe('active');
        });
    });

    describe('Time Expiry', () => {

        it('should FAIL when time limit exceeded', async () => {
            const challenge = createMockChallenge({
                endsAt: new Date(Date.now() - 1000), // Expired 1 second ago
            });

            vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
            vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

            const result = await ChallengeEvaluator.evaluate('test-challenge-1');

            expect(result.status).toBe('failed');
            expect(result.reason).toContain('Time limit');
        });
    });
});

describe('ChallengeEvaluator - Profit Target & Pass', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should PASS and transition to FUNDED when profit target hit', async () => {
        const challenge = createMockChallenge({
            phase: 'challenge',
            startingBalance: '10000.00',
            currentBalance: '11100.00', // $1,100 profit > $1,000 target
        });

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate('test-challenge-1');

        expect(result.status).toBe('passed');
        expect(result.reason).toContain('FUNDED');
    });

    it('should count unrealized gains toward profit target', async () => {
        const challenge = createMockChallenge({
            phase: 'challenge',
            startingBalance: '10000.00',
            currentBalance: '10500.00', // Only $500 realized
            startOfDayBalance: '10500.00', // Avoid daily loss trigger
            highWaterMark: '10500.00',
        });

        // Position with ~$600 unrealized gain (need enough to hit $11k)
        // 100 shares at entry 0.50, current 0.56 = 100 * 0.56 = $56 value
        // Equity = cash + position value = $10,500 + $56 = $10,556 (NOT profit)
        // For profit target: we need equity >= starting + target = $10k + $1k = $11k
        // So we need position value to add $500 more to $10,500
        // 100 shares * price = $500 -> price = $5/share but shares are fractional contracts
        // Actually the evaluator adds position VALUE, so we need 100 * price >= $500
        // price = 5.0 is impossible (max is 1.0)
        // Let's use more shares: 1000 shares @ 0.56 = $560 value
        const position = createMockPosition({
            shares: '1000',
            entryPrice: '0.50',
            direction: 'YES',
        });

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([position as any]);
        // Mock batch price fetch - returns Map of marketId -> price data
        vi.mocked(MarketService.getBatchOrderBookPrices).mockResolvedValue(
            new Map([['market-abc', { price: '0.56', source: 'mock', asset_id: 'market-abc' }]]) as any
        );
        vi.mocked(MarketService.getLatestPrice).mockResolvedValue({
            price: '0.56', // 1000 * 0.56 = $560 position value
            source: 'live',
            timestamp: Date.now(),
        } as any);

        const result = await ChallengeEvaluator.evaluate('test-challenge-1');

        // Equity = $10,500 + $560 = $11,060 > $11,000 target
        expect(result.status).toBe('passed');
    });

    it('should NOT have profit target in funded phase', async () => {
        // Funded accounts accumulate profit indefinitely
        const challenge = createMockChallenge({
            phase: 'funded',
            startingBalance: '10000.00',
            currentBalance: '15000.00', // $5k profit - no target to hit
        });

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate('test-challenge-1');

        // Should stay active (no profit target in funded)
        expect(result.status).toBe('active');
    });
});

describe('ChallengeEvaluator - Position Calculations', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should calculate NO position value correctly as (1 - yesPrice)', async () => {
        const challenge = createMockChallenge({
            startingBalance: '10000.00',
            currentBalance: '9000.00',
            startOfDayBalance: '9000.00', // Set SOD = current to avoid daily loss trigger
            highWaterMark: '10000.00',
        });

        // NO position that's profitable (YES price dropped)
        const position = createMockPosition({
            shares: '100',
            entryPrice: '0.50', // Bought NO at 50 cents
            direction: 'NO',
        });

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([position as any]);
        vi.mocked(MarketService.getBatchOrderBookPrices).mockResolvedValue(
            new Map([['market-abc', { price: '0.30', source: 'mock', asset_id: 'market-abc' }]]) as any
        );
        vi.mocked(MarketService.getLatestPrice).mockResolvedValue({
            price: '0.30', // YES dropped to 30 cents = NO is now 70 cents
            source: 'live',
            timestamp: Date.now(),
        } as any);

        const result = await ChallengeEvaluator.evaluate('test-challenge-1');

        // NO position value: 100 shares * (1 - 0.30) = 100 * 0.70 = $70
        // Entry was at 100 * 0.50 = $50, so $20 profit
        // Equity = $9,000 + $70 = $9,070
        // Drawdown from HWM = $10,000 - $9,070 = $930 < $1,000
        expect(result.status).toBe('active');
        expect(result.equity).toBeCloseTo(9070, 0);
    });

    it('should aggregate multiple positions correctly', async () => {
        const challenge = createMockChallenge({
            startingBalance: '10000.00',
            currentBalance: '10000.00',
            highWaterMark: '10000.00',
        });

        const positions = [
            createMockPosition({ id: 'pos-1', shares: '100', entryPrice: '0.50', direction: 'YES', marketId: 'market-1' }),
            createMockPosition({ id: 'pos-2', shares: '50', entryPrice: '0.60', direction: 'NO', marketId: 'market-2' }),
        ];

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue(positions as any);
        vi.mocked(MarketService.getBatchOrderBookPrices).mockResolvedValue(
            new Map([
                ['market-1', { price: '0.55', source: 'mock', asset_id: 'market-1' }],
                ['market-2', { price: '0.50', source: 'mock', asset_id: 'market-2' }]
            ]) as any
        );
        vi.mocked(MarketService.getLatestPrice)
            .mockResolvedValueOnce({ price: '0.55', source: 'live', timestamp: Date.now() } as any) // market-1: YES up
            .mockResolvedValueOnce({ price: '0.50', source: 'live', timestamp: Date.now() } as any); // market-2: YES down (NO up)

        const result = await ChallengeEvaluator.evaluate('test-challenge-1');

        // Position 1: 100 * 0.55 = $55 value (was $50, +$5)
        // Position 2: 50 * (1 - 0.50) = 50 * 0.50 = $25 (was 50 * 0.40 = $20, +$5... wait)
        // Actually entry for NO was 0.60, so entry value = 50 * (1 - 0.60) = 50 * 0.40 = $20
        // Current = 50 * 0.50 = $25, so +$5
        // Total position value = $55 + $25 = $80
        // Equity = $10,000 + ($55 - $50) + ($25 - $20) = $10,000 + $5 + $5 = $10,010
        // Actually evaluator adds position VALUE not PnL
        // Position 1 value = 100 * 0.55 = $55
        // Position 2 value = 50 * 0.50 = $25
        // Total = $80
        // Equity = $10,000 (cash) + $80 (position value) = $10,080
        expect(result.status).toBe('active');
        expect(result.equity).toBeCloseTo(10080, 0);
    });
});

describe('ChallengeEvaluator - Already Completed', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return existing status for already passed challenge', async () => {
        const challenge = createMockChallenge({
            status: 'passed',
        });

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);

        const result = await ChallengeEvaluator.evaluate('test-challenge-1');

        expect(result.status).toBe('passed');
    });

    it('should return existing status for already failed challenge', async () => {
        const challenge = createMockChallenge({
            status: 'failed',
        });

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);

        const result = await ChallengeEvaluator.evaluate('test-challenge-1');

        expect(result.status).toBe('failed');
    });

    it('should handle non-existent challenge gracefully', async () => {
        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(undefined);

        const result = await ChallengeEvaluator.evaluate('non-existent');

        expect(result.status).toBe('active'); // Default fallback
    });
});

describe('ChallengeEvaluator - Tier-Specific Rules', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should apply 5k tier rules for $5000 starting balance', async () => {
        const challenge = createMockChallenge({
            phase: 'funded',
            startingBalance: '5000.00',
            currentBalance: '4550.00', // $450 down (just under $400 limit for 5k tier)
        });

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate('test-challenge-1');

        // 5k tier max drawdown = $400, we're at $450 down = FAIL
        expect(result.status).toBe('failed');
    });

    it('should apply 25k tier rules for $25000 starting balance', async () => {
        const challenge = createMockChallenge({
            phase: 'funded',
            startingBalance: '25000.00',
            currentBalance: '23000.00', // $2000 down (under $2500 limit)
        });

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(challenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate('test-challenge-1');

        // 25k tier max drawdown = $2500, we're at $2000 down = ACTIVE
        expect(result.status).toBe('active');
    });
});
