import { describe, it, expect, vi, beforeEach } from "vitest";
import { RiskEngine } from "./risk";

// Mock dependencies
vi.mock("@/db", () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn()
            }))
        })),
        query: {
            positions: {
                findMany: vi.fn(),
                findFirst: vi.fn(() => null) // For arbitrage detector
            }
        }
    }
}));

vi.mock("@/app/actions/market", () => ({
    getActiveMarkets: vi.fn(),
    getMarketById: vi.fn(),
    getEventInfoForMarket: vi.fn(() => null) // Returns null = standalone market (uses per-market fallback)
}));

// Import after mocking
import { db } from "@/db";
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- imported to verify mock exists
import { getActiveMarkets, getMarketById, getEventInfoForMarket } from "@/app/actions/market";

describe("RiskEngine.validateTrade", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should allow valid trade within all limits", async () => {
        const mockChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "10000",
            startingBalance: "10000",
            startOfDayBalance: "10000",
            rulesConfig: {
                maxTotalDrawdownPercent: 0.10,
                maxDailyDrawdownPercent: 0.05,
                maxPositionSizePercent: 0.05,
                maxCategoryExposurePercent: 0.10,
                maxVolumeImpactPercent: 0.10,
                minMarketVolume: 100_000
            }
        };

        const mockMarket = {
            id: "market-1",
            volume: 15_000_000, // High volume
            categories: ["Politics"]
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        vi.mocked(getMarketById).mockResolvedValue(mockMarket as any);
        vi.mocked(getActiveMarkets).mockResolvedValue([mockMarket] as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]); // No existing positions

        const result = await RiskEngine.validateTrade("challenge-1", "market-1", 100);

        expect(result.allowed).toBe(true);
    });

    it("should reject when challenge not active", async () => {
        const mockChallenge = {
            id: "challenge-1",
            status: "failed", // NOT active
            currentBalance: "10000",
            startingBalance: "10000"
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        const result = await RiskEngine.validateTrade("challenge-1", "market-1", 100);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("not active");
    });

    it("should reject when max total drawdown would be exceeded", async () => {
        const mockChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "9100", // Already drawn down $900
            startingBalance: "10000",
            startOfDayBalance: "9100",
            rulesConfig: {
                maxTotalDrawdownPercent: 0.08, // 8% = $800, but already at $900 loss
            }
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        // Trade with $200 estimated loss would bring balance below floor
        const result = await RiskEngine.validateTrade("challenge-1", "market-1", 100, 200);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Max Total Drawdown");
    });

    it("should reject when max daily drawdown would be exceeded", async () => {
        const mockChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "9700", // $300 down from SOD
            startingBalance: "10000",
            startOfDayBalance: "10000", // SOD was $10k
            rulesConfig: {
                maxTotalDrawdownPercent: 0.10,
                maxDailyDrawdownPercent: 0.04, // 4% = $400 daily limit
            }
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        // Trade with $200 estimated loss would exceed daily limit
        const result = await RiskEngine.validateTrade("challenge-1", "market-1", 100, 200);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Max Daily Loss");
    });

    it("should reject when per-market exposure exceeded", async () => {
        const mockChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "10000",
            startingBalance: "10000",
            startOfDayBalance: "10000",
            rulesConfig: {
                maxTotalDrawdownPercent: 0.10,
                maxDailyDrawdownPercent: 0.05,
                maxPositionSizePercent: 0.05, // 5% = $500 max per market
            }
        };

        // Existing position of $400 in this market
        const existingPositions = [
            { marketId: "market-1", sizeAmount: "400", status: "OPEN" }
        ];

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        vi.mocked(db.query.positions.findMany).mockResolvedValue(existingPositions as any);
        vi.mocked(getActiveMarkets).mockResolvedValue([]);

        // New $150 trade would bring total to $550 > $500 limit
        const result = await RiskEngine.validateTrade("challenge-1", "market-1", 150);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("exposure"); // Changed from "per-market" to "per-event" after RULE 3 update
    });

    it("should reject when market volume too low", async () => {
        const mockChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "10000",
            startingBalance: "10000",
            startOfDayBalance: "10000",
            rulesConfig: {
                maxPositionSizePercent: 0.05,
                minMarketVolume: 100_000 // Require at least $100k
            }
        };

        const lowVolumeMarket = {
            id: "market-1",
            volume: 50_000, // Only $50k - too low
            categories: []
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);
        vi.mocked(getMarketById).mockResolvedValue(lowVolumeMarket as any);
        vi.mocked(getActiveMarkets).mockResolvedValue([lowVolumeMarket] as any);

        const result = await RiskEngine.validateTrade("challenge-1", "market-1", 100);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("insufficient volume");
    });

    it("should reject when max open positions exceeded", async () => {
        const mockChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "10000",
            startingBalance: "10000", // 10k tier = 15 positions max
            startOfDayBalance: "10000",
            rulesConfig: {
                maxPositionSizePercent: 0.05,
            }
        };

        // Already have 15 open positions
        const fifteenPositions = Array.from({ length: 15 }, (_, i) => ({
            id: `pos-${i}`,
            marketId: `market-${i}`,
            status: "OPEN",
            sizeAmount: "100"
        }));

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        // Now positions are fetched ONCE at the start, so mock returns all 15
        vi.mocked(db.query.positions.findMany).mockResolvedValue(fifteenPositions as any);

        vi.mocked(getMarketById).mockResolvedValue(
            { id: "new-market", volume: 15_000_000, categories: [] } as any
        );
        vi.mocked(getActiveMarkets).mockResolvedValue([
            { id: "new-market", volume: 15_000_000, categories: [] }
        ] as any);

        const result = await RiskEngine.validateTrade("challenge-1", "new-market", 100);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Max 15 open positions");
    });

    it("should reject when category exposure exceeded", async () => {
        const mockChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "10000",
            startingBalance: "10000",
            startOfDayBalance: "10000",
            rulesConfig: {
                maxPositionSizePercent: 0.05,
                maxCategoryExposurePercent: 0.10, // 10% = $1000 per category
                minMarketVolume: 100_000
            }
        };

        // Existing positions in Politics category (in different market)
        const existingPositions = [
            { marketId: "politics-1", sizeAmount: "800", status: "OPEN" }
        ];

        const markets = [
            { id: "politics-1", volume: 15_000_000, categories: ["Politics"] },
            { id: "politics-2", volume: 15_000_000, categories: ["Politics"] } // Target market
        ];

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        // Now positions are fetched ONCE at the start
        vi.mocked(db.query.positions.findMany).mockResolvedValue(existingPositions as any);

        // Mock getMarketById for the target market
        vi.mocked(getMarketById).mockResolvedValue(
            { id: "politics-2", volume: 15_000_000, categories: ["Politics"] } as any
        );
        vi.mocked(getActiveMarkets).mockResolvedValue(markets as any);

        // New $300 trade in Politics would bring category total to $1100 > $1000 limit
        const result = await RiskEngine.validateTrade("challenge-1", "politics-2", 300);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Politics exposure");
    });
});

describe("RiskEngine - Volume and Liquidity Rules", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should block trade when it exceeds volume-tiered exposure limit (RULE 5)", async () => {
        const mockChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "25000",
            startingBalance: "25000",
            startOfDayBalance: "25000",
            rulesConfig: {
                maxPositionSizePercent: 0.05,
                maxVolumeImpactPercent: 0.10,
                minMarketVolume: 100_000
            }
        };

        // Medium volume market ($1-10M) = 2.5% max exposure = $625
        const mediumVolumeMarket = {
            id: "market-1",
            volume: 5_000_000,
            categories: []
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);
        vi.mocked(getMarketById).mockResolvedValue(mediumVolumeMarket as any);
        vi.mocked(getActiveMarkets).mockResolvedValue([mediumVolumeMarket] as any);

        // $700 trade should be blocked (limit is $625 for 2.5% tier)
        const result = await RiskEngine.validateTrade("challenge-1", "market-1", 700);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("limited liquidity");
    });

    it("should allow trade when market impact is within 10% limit (RULE 6)", async () => {
        // NOTE: With current config (minMarketVolume=$100k, per-event=5%), RULE 6 is effectively
        // shadowed by RULE 3. Per-event limit ($1250 on $25k) is always tighter than
        // market impact limit (10% of $100k+ = $10k+). This test verifies RULE 6 passes
        // when trade is well within limits.
        const mockChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "25000",
            startingBalance: "25000",
            startOfDayBalance: "25000",
            rulesConfig: {
                maxPositionSizePercent: 0.05,
                maxVolumeImpactPercent: 0.10,
                minMarketVolume: 100_000
            }
        };

        const highVolumeMarket = {
            id: "market-1",
            volume: 15_000_000, // High volume - 5% tier = $1250 limit, 10% impact = $1.5M
            categories: []
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);
        vi.mocked(getMarketById).mockResolvedValue(highVolumeMarket as any);
        vi.mocked(getActiveMarkets).mockResolvedValue([highVolumeMarket] as any);

        // $1000 trade - passes RULE 3 ($1000 < $1250), passes RULE 5 (high vol = $1250 limit),
        // and passes RULE 6 ($1000 < $1.5M)
        const result = await RiskEngine.validateTrade("challenge-1", "market-1", 1000);

        expect(result.allowed).toBe(true);
    });

    it("should block trade when market data unavailable (DEFENSIVE)", async () => {
        const mockChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "10000",
            startingBalance: "10000",
            startOfDayBalance: "10000",
            rulesConfig: {
                maxPositionSizePercent: 0.05,
                minMarketVolume: 100_000
            }
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);
        vi.mocked(getMarketById).mockResolvedValue(null); // Market data unavailable!
        vi.mocked(getActiveMarkets).mockResolvedValue([]);

        const result = await RiskEngine.validateTrade("challenge-1", "unknown-market", 100);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Market data unavailable");
    });
});

describe("RiskEngine - Position Tier Limits", () => {
    // Testing getMaxPositionsForTier via validateTrade behavior
    // (method is private but its effect is observable)

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("allows 10 positions for $5000 account", async () => {
        const mockChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "5000",
            startingBalance: "5000", // 5k tier
            startOfDayBalance: "5000",
            rulesConfig: { maxPositionSizePercent: 0.05 }
        };

        // 10 positions = at limit for 5k tier
        const tenPositions = Array.from({ length: 10 }, (_, i) => ({
            id: `pos-${i}`, marketId: `m-${i}`, status: "OPEN", sizeAmount: "50"
        }));

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        // Positions fetched once at start
        vi.mocked(db.query.positions.findMany).mockResolvedValue(tenPositions as any);

        vi.mocked(getMarketById).mockResolvedValue(
            { id: "new-market", volume: 15_000_000, categories: [] } as any
        );
        vi.mocked(getActiveMarkets).mockResolvedValue([
            { id: "new-market", volume: 15_000_000, categories: [] }
        ] as any);

        const result = await RiskEngine.validateTrade("challenge-1", "new-market", 50);

        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("Max 10 open positions");
    });
});

describe("RiskEngine.updateHighWaterMark", () => {
    it("should be a no-op (delegated to evaluator)", async () => {
        // Just verify it doesn't throw
        await RiskEngine.updateHighWaterMark("challenge-1", 11000);
        // The method logs but doesn't update - this is expected behavior
    });
});
