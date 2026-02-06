import { describe, it, expect, vi, beforeEach } from "vitest";
import { TradeExecutor } from "@/lib/trade";
import { ChallengeManager } from "@/lib/challenges";
import { MarketService } from "@/lib/market";
import { RiskEngine } from "@/lib/risk";

// Mock external dependencies
vi.mock("@/db", () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn(() => [{
                    id: "challenge-123",
                    userId: "user-1",
                    status: "active",
                    currentBalance: "10000",
                    rulesConfig: {}
                }])
            }))
        })),
        transaction: vi.fn((callback) => callback({
            execute: vi.fn(), // FOR UPDATE lock
            select: vi.fn(() => ({
                from: vi.fn(() => ({
                    where: vi.fn(() => [{
                        id: "challenge-123",
                        currentBalance: "10000",
                        rulesConfig: {}
                    }])
                }))
            })),
            insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => [{ id: "trade-123", marketId: "asset-123", price: "0.5025", shares: "1990" }]) })) })),
            update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
            query: {
                positions: {
                    findFirst: vi.fn(() => null) // Default no position
                },
                challenges: {
                    findFirst: vi.fn(() => ({
                        id: "challenge-123",
                        currentBalance: "10000"
                    }))
                }
            }
        }))
    }
}));

// Import after mocking
import { db } from "@/db";

vi.mock("@/lib/challenges", () => ({
    ChallengeManager: {
        getActiveChallenge: vi.fn()
    }
}));

vi.mock("@/lib/market", () => ({
    MarketService: {
        getLatestPrice: vi.fn(),
        isPriceFresh: vi.fn(() => true),
        getOrderBook: vi.fn(() => ({
            bids: [{ price: "0.50", size: "10000" }],
            asks: [{ price: "0.51", size: "10000" }],
            source: "live"
        })),
        calculateImpact: vi.fn(() => ({
            filled: true,
            executedPrice: 0.5025,
            totalShares: 1990,
            slippagePercent: 0.005,
            reason: null
        })),
        lookupPriceFromEvents: vi.fn(() => null), // Returns null = skip integrity check
        buildSyntheticOrderBookPublic: vi.fn()
    }
}));

vi.mock("@/lib/risk", () => ({
    RiskEngine: {
        validateTrade: vi.fn()
    }
}));

describe("TradeExecutor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset db.select to default successful challenge mock
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn(() => ({
                where: vi.fn(() => [{
                    id: "challenge-123",
                    userId: "user-1",
                    status: "active",
                    currentBalance: "10000",
                    rulesConfig: {}
                }])
            }))
        } as any);
    });

    it("should execute a valid BUY trade", async () => {
        const mockChallenge = {
            id: "challenge-123",
            currentBalance: "10000",
            rulesConfig: {}
        };
        const mockMarketData = {
            price: "0.50",
            asset_id: "asset-123",
            timestamp: Date.now()
        };

        // Setup Mocks - Cast to any to avoid strict TS mock typing issues
        // Note: TradeExecutor now queries challenge directly from DB, not via ChallengeManager
        vi.mocked(MarketService.getLatestPrice).mockResolvedValue(mockMarketData as any);
        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: true });

        // Execute
        const result = await TradeExecutor.executeTrade("user-1", "challenge-123", "asset-123", "BUY", 1000);

        // Verify
        expect(MarketService.getLatestPrice).toHaveBeenCalledWith("asset-123");
        expect(RiskEngine.validateTrade).toHaveBeenCalledWith("challenge-123", "asset-123", 1000, 0, "YES");

        // Result should match the mocked DB return
        expect(result.id).toBe("trade-123");
        expect(result.shares).toBe("1990");
    });

    it("should reject trade if balance is insufficient", async () => {
        // Override the db mock to return low balance challenge
        const lowBalanceChallenge = {
            id: "challenge-123",
            userId: "user-1",
            status: "active",
            currentBalance: "500", // Less than trade amount
            rulesConfig: {}
        };

        // Mock the DB select to return low balance challenge
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn(() => ({
                where: vi.fn(() => [lowBalanceChallenge])
            }))
        } as any);

        vi.mocked(MarketService.getLatestPrice).mockResolvedValue({ price: "0.50", asset_id: "a", timestamp: Date.now() } as any);

        await expect(TradeExecutor.executeTrade("user-1", "challenge-123", "a", "BUY", 1000))
            .rejects.toThrow(); // Throws InsufficientFundsError
    });

    it("should reject trade if risk check fails", async () => {
        // Note: TradeExecutor now queries challenge directly from DB, mocked at top of file
        vi.mocked(MarketService.getLatestPrice).mockResolvedValue({ price: "0.50", asset_id: "a", timestamp: Date.now() } as any);
        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: false, reason: "Max Drawdown" });

        await expect(TradeExecutor.executeTrade("user-1", "challenge-123", "a", "BUY", 1000))
            .rejects.toThrow("Max Drawdown"); // Error reason from RiskEngine
    });
});

// === NO POSITION TESTS ===

describe("TradeExecutor - NO Position Direction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset db.select to default successful challenge mock
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn(() => ({
                where: vi.fn(() => [{
                    id: "challenge-123",
                    userId: "user-1",
                    status: "active",
                    currentBalance: "10000",
                    rulesConfig: {}
                }])
            }))
        } as any);
    });

    it("should accept direction='NO' parameter", async () => {
        const mockChallenge = {
            id: "challenge-123",
            currentBalance: "10000",
            rulesConfig: {}
        };
        const mockMarketData = {
            price: "0.40",  // YES price
            asset_id: "asset-123",
            timestamp: Date.now()
        };

        // Note: TradeExecutor now queries challenge directly from DB, mocked at top of file
        vi.mocked(MarketService.getLatestPrice).mockResolvedValue(mockMarketData as any);
        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: true });

        // Mock order book for NO position (inverted)
        vi.mocked(MarketService.getOrderBook).mockResolvedValue({
            bids: [{ price: "0.40", size: "10000" }],
            asks: [{ price: "0.41", size: "10000" }],
            source: "live"
        } as any);

        vi.mocked(MarketService.calculateImpact).mockReturnValue({
            filled: true,
            executedPrice: 0.60, // 1 - 0.40 for NO
            totalShares: 1666,   // $1000 / $0.60
            slippagePercent: 0.005,
            reason: null as any
        });

        // Execute with direction='NO'
        const result = await TradeExecutor.executeTrade(
            "user-1",
            "challenge-123",
            "asset-123",
            "BUY",
            1000,
            "NO"  // Direction parameter
        );

        // Should not throw - direction is accepted
        expect(result).toBeDefined();
    });

    it("should default to YES direction when not specified", async () => {
        const mockChallenge = {
            id: "challenge-123",
            currentBalance: "10000",
            rulesConfig: {}
        };

        // Note: TradeExecutor now queries challenge directly from DB, mocked at top of file
        vi.mocked(MarketService.getLatestPrice).mockResolvedValue({
            price: "0.50",
            asset_id: "asset-123",
            timestamp: Date.now()
        } as any);
        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: true });

        // Execute WITHOUT direction (should default to YES)
        const result = await TradeExecutor.executeTrade(
            "user-1",
            "challenge-123",
            "asset-123",
            "BUY",
            1000
            // No direction param = defaults to YES
        );

        expect(result).toBeDefined();
    });
});

// === BUG FIX TEST: BUY NO should use BIDS side of order book ===
// Issue: BUY NO was using ASKS (99¢) and converting to 0.1¢, instead of
// using BIDS (68¢) and converting to 32¢.

describe("TradeExecutor - BUY NO Order Book Side Bug Fix", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset db.select to default successful challenge mock
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn(() => ({
                where: vi.fn(() => [{
                    id: "challenge-123",
                    userId: "user-1",
                    status: "active",
                    currentBalance: "10000",
                    rulesConfig: {}
                }])
            }))
        } as any);
    });

    it("BUY NO should use BIDS side and execute at converted bid price", async () => {
        // Setup: Wide-spread order book like Super Bowl market
        // Best BID: 68¢ (what YES buyers will pay)
        // Best ASK: 99¢ (what YES sellers want)
        const wideSpreadOrderBook = {
            bids: [{ price: "0.68", size: "10000" }],  // YES buyers at 68¢
            asks: [{ price: "0.99", size: "10000" }],  // YES sellers at 99¢
            source: "live" as const
        };

        vi.mocked(MarketService.getLatestPrice).mockResolvedValue({
            price: "0.68",  // Display price matches best bid
            asset_id: "superbowl-token",
            timestamp: Date.now(),
            source: "live"
        } as any);

        vi.mocked(MarketService.getOrderBook).mockResolvedValue(wideSpreadOrderBook as any);

        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: true });

        // Track which side calculateImpact was called with
        let capturedSide: "BUY" | "SELL" | null = null;
        vi.mocked(MarketService.calculateImpact).mockImplementation((book, side, amount) => {
            capturedSide = side;
            // Return price based on which side was actually used
            if (side === "BUY") {
                // BUY consumes asks → 99¢ (WRONG for NO direction)
                return {
                    filled: true,
                    executedPrice: 0.99,
                    totalShares: amount / 0.99,
                    slippagePercent: 0,
                    reason: null as any
                };
            } else {
                // SELL consumes bids → 68¢ (CORRECT for NO direction)
                return {
                    filled: true,
                    executedPrice: 0.68,
                    totalShares: amount / 0.68,
                    slippagePercent: 0,
                    reason: null as any
                };
            }
        });

        // Execute BUY NO
        const result = await TradeExecutor.executeTrade(
            "user-1",
            "challenge-123",
            "superbowl-token",
            "BUY",
            10,   // $10 trade
            "NO"  // Direction = NO
        );

        // ASSERTION: calculateImpact should be called with SELL (bids side)
        // because BUY NO = match against YES bids
        expect(capturedSide).toBe("SELL");

        // Note: Execution price assertion removed because DB mock returns hardcoded value.
        // The critical verification is that the order book side is flipped correctly.
    });

    it("BUY YES should still use ASKS side (regression check)", async () => {
        const wideSpreadOrderBook = {
            bids: [{ price: "0.68", size: "10000" }],
            asks: [{ price: "0.70", size: "10000" }],  // Reasonable spread
            source: "live" as const
        };

        vi.mocked(MarketService.getLatestPrice).mockResolvedValue({
            price: "0.69",
            asset_id: "normal-market",
            timestamp: Date.now(),
            source: "live"
        } as any);

        vi.mocked(MarketService.getOrderBook).mockResolvedValue(wideSpreadOrderBook as any);
        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: true });

        let capturedSide: "BUY" | "SELL" | null = null;
        vi.mocked(MarketService.calculateImpact).mockImplementation((book, side, amount) => {
            capturedSide = side;
            return {
                filled: true,
                executedPrice: side === "BUY" ? 0.70 : 0.68,
                totalShares: amount / 0.70,
                slippagePercent: 0,
                reason: null as any
            };
        });

        // Execute BUY YES (default)
        const result = await TradeExecutor.executeTrade(
            "user-1",
            "challenge-123",
            "normal-market",
            "BUY",
            10,
            "YES"
        );

        // ASSERTION: BUY YES should use BUY side (asks)
        expect(capturedSide).toBe("BUY");

        // Note: Execution price assertion removed because DB mock returns hardcoded value.
        // The critical verification is that the order book side is correct.
    });
});
