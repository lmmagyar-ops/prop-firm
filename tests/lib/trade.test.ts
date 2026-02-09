import { describe, it, expect, vi, beforeEach } from "vitest";
import { TradeExecutor } from "@/lib/trade";
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
        // NEW: Single source of truth for trade execution
        getCanonicalPrice: vi.fn(() => 0.50), // Default: 50¢
        // Synthetic book builder
        buildSyntheticOrderBookPublic: vi.fn((price: number) => ({
            bids: [{ price: (price - 0.01).toFixed(2), size: "10000" }],
            asks: [{ price: price.toFixed(2), size: "10000" }],
        })),
        calculateImpact: vi.fn(() => ({
            filled: true,
            executedPrice: 0.5025,
            totalShares: 1990,
            slippagePercent: 0.005,
            reason: null
        })),
    }
}));

vi.mock("@/lib/risk", () => ({
    RiskEngine: {
        validateTrade: vi.fn()
    }
}));

// ================================================
// CORE TRADE EXECUTION TESTS
// ================================================

describe("TradeExecutor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset defaults
        vi.mocked(MarketService.getCanonicalPrice).mockResolvedValue(0.50);
        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: true });
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
        const result = await TradeExecutor.executeTrade("user-1", "challenge-123", "asset-123", "BUY", 1000);

        expect(MarketService.getCanonicalPrice).toHaveBeenCalledWith("asset-123");
        expect(RiskEngine.validateTrade).toHaveBeenCalledWith("challenge-123", "asset-123", 1000, 0, "YES");
        expect(result.id).toBe("trade-123");
        expect(result.priceSource).toBe("canonical");
    });

    it("should reject trade if market not found", async () => {
        vi.mocked(MarketService.getCanonicalPrice).mockResolvedValue(null);

        await expect(TradeExecutor.executeTrade("user-1", "challenge-123", "a", "BUY", 1000))
            .rejects.toThrow("unavailable");
    });

    it("should reject trade on nearly-resolved market (≥95¢)", async () => {
        vi.mocked(MarketService.getCanonicalPrice).mockResolvedValue(0.97);

        await expect(TradeExecutor.executeTrade("user-1", "challenge-123", "a", "BUY", 1000))
            .rejects.toThrow("nearly resolved");
    });

    it("should reject trade on nearly-resolved market (≤5¢)", async () => {
        vi.mocked(MarketService.getCanonicalPrice).mockResolvedValue(0.03);

        await expect(TradeExecutor.executeTrade("user-1", "challenge-123", "a", "BUY", 1000))
            .rejects.toThrow("nearly resolved");
    });

    it("should allow trade at 94¢ (just below resolution threshold)", async () => {
        vi.mocked(MarketService.getCanonicalPrice).mockResolvedValue(0.94);

        // Won't throw MARKET_RESOLVED (94¢ < 95¢ threshold)
        const result = await TradeExecutor.executeTrade("user-1", "challenge-123", "a", "BUY", 1000);
        expect(result).toBeDefined();
    });

    it("should reject trade if balance is insufficient", async () => {
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn(() => ({
                where: vi.fn(() => [{
                    id: "challenge-123",
                    userId: "user-1",
                    status: "active",
                    currentBalance: "500",
                    rulesConfig: {}
                }])
            }))
        } as any);

        await expect(TradeExecutor.executeTrade("user-1", "challenge-123", "a", "BUY", 1000))
            .rejects.toThrow();
    });

    it("should reject trade if risk check fails", async () => {
        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: false, reason: "Max Drawdown" });

        await expect(TradeExecutor.executeTrade("user-1", "challenge-123", "a", "BUY", 1000))
            .rejects.toThrow("Max Drawdown");
    });
});

// ================================================
// NO POSITION DIRECTION TESTS
// ================================================

describe("TradeExecutor - NO Position Direction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(MarketService.getCanonicalPrice).mockResolvedValue(0.40);
        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: true });
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
        vi.mocked(MarketService.calculateImpact).mockReturnValue({
            filled: true,
            executedPrice: 0.60, // 1 - 0.40 for NO
            totalShares: 1666,
            slippagePercent: 0.005,
            reason: null as any
        });

        const result = await TradeExecutor.executeTrade(
            "user-1", "challenge-123", "asset-123", "BUY", 1000, "NO"
        );
        expect(result).toBeDefined();
    });

    it("should default to YES direction when not specified", async () => {
        vi.mocked(MarketService.getCanonicalPrice).mockResolvedValue(0.50);

        const result = await TradeExecutor.executeTrade(
            "user-1", "challenge-123", "asset-123", "BUY", 1000
        );
        expect(result).toBeDefined();
    });
});

// ================================================
// BUY NO ORDER BOOK SIDE BUG FIX TESTS
// ================================================

describe("TradeExecutor - BUY NO Order Book Side", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(MarketService.getCanonicalPrice).mockResolvedValue(0.68);
        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: true });
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

    it("BUY NO should use SELL side (bids) for order book simulation", async () => {
        let capturedSide: "BUY" | "SELL" | null = null;
        vi.mocked(MarketService.calculateImpact).mockImplementation((_book, side) => {
            capturedSide = side;
            return {
                filled: true,
                executedPrice: side === "BUY" ? 0.99 : 0.68,
                totalShares: 10 / 0.68,
                slippagePercent: 0,
                reason: null as any
            };
        });

        await TradeExecutor.executeTrade(
            "user-1", "challenge-123", "superbowl-token", "BUY", 10, "NO"
        );

        // BUY NO = match against YES bids = SELL side
        expect(capturedSide).toBe("SELL");
    });

    it("BUY YES should use BUY side (asks) — regression check", async () => {
        vi.mocked(MarketService.getCanonicalPrice).mockResolvedValue(0.69);

        let capturedSide: "BUY" | "SELL" | null = null;
        vi.mocked(MarketService.calculateImpact).mockImplementation((_book, side) => {
            capturedSide = side;
            return {
                filled: true,
                executedPrice: 0.70,
                totalShares: 10 / 0.70,
                slippagePercent: 0,
                reason: null as any
            };
        });

        await TradeExecutor.executeTrade(
            "user-1", "challenge-123", "normal-market", "BUY", 10, "YES"
        );

        // BUY YES = BUY side (asks)
        expect(capturedSide).toBe("BUY");
    });
});

// ================================================
// INVARIANT ASSERTION TESTS
// ================================================
// These test the guards at lines 182-227 of trade.ts
// They catch impossible math states before they corrupt the DB

describe("TradeExecutor - Invariant Assertions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(MarketService.getCanonicalPrice).mockResolvedValue(0.50);
        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: true });
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

    it("rejects Infinity shares (INVARIANT_VIOLATION)", async () => {
        // If executionPrice is extremely close to 0, shares → Infinity
        vi.mocked(MarketService.calculateImpact).mockReturnValue({
            filled: true,
            executedPrice: 0, // Would cause amount / 0 = Infinity
            totalShares: Infinity,
            slippagePercent: 0,
            reason: null as any
        });

        await expect(
            TradeExecutor.executeTrade("user-1", "challenge-123", "mkt-1", "BUY", 1000)
        ).rejects.toThrow("invalid");
    });

    it("rejects zero shares (INVARIANT_VIOLATION)", async () => {
        vi.mocked(MarketService.calculateImpact).mockReturnValue({
            filled: true,
            executedPrice: 0.50,
            totalShares: 0,
            slippagePercent: 0,
            reason: null as any
        });

        await expect(
            TradeExecutor.executeTrade("user-1", "challenge-123", "mkt-1", "BUY", 1000)
        ).rejects.toThrow("invalid share count");
    });

    it("rejects executionPrice = 0 (INVARIANT_VIOLATION)", async () => {
        vi.mocked(MarketService.calculateImpact).mockReturnValue({
            filled: true,
            executedPrice: 0, // Invalid — price can't be exactly 0
            totalShares: 1000,
            slippagePercent: 0,
            reason: null as any
        });

        await expect(
            TradeExecutor.executeTrade("user-1", "challenge-123", "mkt-1", "BUY", 1000)
        ).rejects.toThrow("invalid");
    });

    it("rejects executionPrice = 1 (INVARIANT_VIOLATION)", async () => {
        vi.mocked(MarketService.calculateImpact).mockReturnValue({
            filled: true,
            executedPrice: 1.0, // Invalid — can't be exactly 1
            totalShares: 1000,
            slippagePercent: 0,
            reason: null as any
        });

        await expect(
            TradeExecutor.executeTrade("user-1", "challenge-123", "mkt-1", "BUY", 1000)
        ).rejects.toThrow("invalid execution price");
    });

    it("rejects BUY that would create negative balance (INVARIANT_VIOLATION)", async () => {
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn(() => ({
                where: vi.fn(() => [{
                    id: "challenge-123",
                    userId: "user-1",
                    status: "active",
                    currentBalance: "800", // Less than the $1000 trade
                    rulesConfig: {}
                }])
            }))
        } as any);

        await expect(
            TradeExecutor.executeTrade("user-1", "challenge-123", "mkt-1", "BUY", 1000)
        ).rejects.toThrow();
    });

    it("rejects if simulation is not filled", async () => {
        vi.mocked(MarketService.calculateImpact).mockReturnValue({
            filled: false,
            executedPrice: 0,
            totalShares: 0,
            slippagePercent: 0,
            reason: "Insufficient liquidity"
        });

        await expect(
            TradeExecutor.executeTrade("user-1", "challenge-123", "mkt-1", "BUY", 1000)
        ).rejects.toThrow("Insufficient liquidity");
    });

    it("rejects if slippage exceeds maxSlippage option", async () => {
        vi.mocked(MarketService.calculateImpact).mockReturnValue({
            filled: true,
            executedPrice: 0.55,
            totalShares: 1818,
            slippagePercent: 0.05, // 5% slippage
            reason: null as any
        });

        await expect(
            TradeExecutor.executeTrade("user-1", "challenge-123", "mkt-1", "BUY", 1000, "YES", {
                maxSlippage: 0.02 // Only accepts 2%
            })
        ).rejects.toThrow("Slippage");
    });

    it("rejects inactive challenge", async () => {
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn(() => ({
                where: vi.fn(() => [{
                    id: "challenge-123",
                    userId: "user-1",
                    status: "failed", // Not active
                    currentBalance: "10000",
                    rulesConfig: {}
                }])
            }))
        } as any);

        await expect(
            TradeExecutor.executeTrade("user-1", "challenge-123", "mkt-1", "BUY", 1000)
        ).rejects.toThrow("not active");
    });

    it("rejects challenge not found (wrong user)", async () => {
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn(() => ({
                where: vi.fn(() => []) // No matching challenge
            }))
        } as any);

        await expect(
            TradeExecutor.executeTrade("wrong-user", "challenge-123", "mkt-1", "BUY", 1000)
        ).rejects.toThrow("not found");
    });
});

// ================================================
// ORCHESTRATION TESTS — DB Transaction Pipeline
// ================================================
// These verify the full flow: trade → position → balance

describe("TradeExecutor - Orchestration", () => {
    let mockTx: any;
    let mockInsertedTrade: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(MarketService.getCanonicalPrice).mockResolvedValue(0.50);
        vi.mocked(MarketService.calculateImpact).mockReturnValue({
            filled: true,
            executedPrice: 0.5025,
            totalShares: 1990,
            slippagePercent: 0.005,
            reason: null as any
        });
        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: true });

        mockInsertedTrade = { id: "trade-456", marketId: "mkt-1", price: "0.5025", shares: "1990" };

        // Set up mock tx that tracks calls
        mockTx = {
            execute: vi.fn(), // FOR UPDATE lock
            select: vi.fn().mockReturnValue({
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([{
                        id: "challenge-123",
                        currentBalance: "10000",
                        rulesConfig: {}
                    }])
                })
            }),
            insert: vi.fn().mockReturnValue({
                values: vi.fn().mockReturnValue({
                    returning: vi.fn().mockResolvedValue([mockInsertedTrade])
                })
            }),
            update: vi.fn().mockReturnValue({
                set: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue(undefined)
                })
            }),
            query: {
                positions: {
                    findFirst: vi.fn().mockResolvedValue(null), // No existing position by default
                },
                challenges: {
                    findFirst: vi.fn().mockResolvedValue({
                        id: "challenge-123",
                        currentBalance: "10000"
                    })
                }
            }
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn(() => ({
                where: vi.fn(() => [{
                    id: "challenge-123",
                    userId: "user-1",
                    status: "active",
                    currentBalance: "10000",
                    phase: "challenge",
                    rulesConfig: {}
                }])
            }))
        } as any);

        vi.mocked(db.transaction).mockImplementation(async (callback) => {
            return callback(mockTx);
        });
    });

    it("BUY new position: creates position + deducts balance", async () => {
        const result = await TradeExecutor.executeTrade(
            "user-1", "challenge-123", "mkt-1", "BUY", 1000
        );

        expect(result.id).toBe("trade-456");

        // Should have executed FOR UPDATE lock
        expect(mockTx.execute).toHaveBeenCalled();

        // Insert should have been called (trade record)
        expect(mockTx.insert).toHaveBeenCalled();

        // update should have been called (position link + balance)
        expect(mockTx.update).toHaveBeenCalled();
    });

    it("SELL with no position throws PositionNotFoundError", async () => {
        // No existing position
        mockTx.query.positions.findFirst.mockResolvedValue(null);

        await expect(
            TradeExecutor.executeTrade("user-1", "challenge-123", "mkt-1", "SELL", 500)
        ).rejects.toThrow("No open position");
    });

    it("BUY adds to existing position when one exists", async () => {
        // Mock existing position
        mockTx.query.positions.findFirst.mockResolvedValue({
            id: "pos-existing",
            challengeId: "challenge-123",
            marketId: "mkt-1",
            direction: "YES",
            shares: "100",
            entryPrice: "0.45",
            status: "OPEN",
        });

        const result = await TradeExecutor.executeTrade(
            "user-1", "challenge-123", "mkt-1", "BUY", 500
        );

        expect(result.id).toBe("trade-456");
        // update should be called multiple times: positionManager.addToPosition + balanceManager.deductCost + trade link
        expect(mockTx.update).toHaveBeenCalled();
    });

    it("SELL existing position: reduces position + credits balance", async () => {
        // Mock existing position for sell
        mockTx.query.positions.findFirst.mockResolvedValue({
            id: "pos-existing",
            challengeId: "challenge-123",
            marketId: "mkt-1",
            direction: "YES",
            shares: "200",
            entryPrice: "0.40",
            currentPrice: "0.55",
            status: "OPEN",
        });

        vi.mocked(MarketService.calculateImpact).mockReturnValue({
            filled: true,
            executedPrice: 0.55,
            totalShares: 200,
            slippagePercent: 0.005,
            reason: null as any
        });

        const result = await TradeExecutor.executeTrade(
            "user-1", "challenge-123", "mkt-1", "SELL", 100, "YES", { shares: 200 }
        );

        expect(result.id).toBe("trade-456");
        // Trade record should be linked to position and have realized PnL
        expect(mockTx.update).toHaveBeenCalled();
    });

    it("applies FOR UPDATE row lock before any balance/position ops", async () => {
        const callOrder: string[] = [];

        mockTx.execute = vi.fn().mockImplementation(() => {
            callOrder.push("FOR_UPDATE");
            return Promise.resolve();
        });
        mockTx.select = vi.fn().mockImplementation(() => {
            callOrder.push("SELECT");
            return {
                from: vi.fn().mockReturnValue({
                    where: vi.fn().mockResolvedValue([{
                        id: "challenge-123",
                        currentBalance: "10000",
                        rulesConfig: {}
                    }])
                })
            };
        });

        await TradeExecutor.executeTrade(
            "user-1", "challenge-123", "mkt-1", "BUY", 100
        );

        // FOR UPDATE must come before SELECT
        expect(callOrder[0]).toBe("FOR_UPDATE");
        expect(callOrder[1]).toBe("SELECT");
    });

    it("re-validates risk inside transaction (double-check pattern)", async () => {
        // First call: outside tx (passes), second call: inside tx (fails)
        let callCount = 0;
        vi.mocked(RiskEngine.validateTrade).mockImplementation(async () => {
            callCount++;
            if (callCount >= 2) {
                return { allowed: false, reason: "Concurrent trade exceeded limit" };
            }
            return { allowed: true };
        });

        await expect(
            TradeExecutor.executeTrade("user-1", "challenge-123", "mkt-1", "BUY", 1000)
        ).rejects.toThrow("Concurrent trade exceeded limit");

        // Risk check should have been called twice
        expect(callCount).toBe(2);
    });
});
