import { describe, it, expect, vi, beforeEach } from "vitest";
import { TradeExecutor } from "./trade";
import { ChallengeManager } from "./challenges";
import { MarketService } from "./market";
import { RiskEngine } from "./risk";

// Mock external dependencies
vi.mock("@/db", () => ({
    db: {
        transaction: vi.fn((callback) => callback({
            insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(() => [{ id: "trade-123", marketId: "asset-123", price: "0.5025", shares: "1990" }]) })) })),
            update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
            query: {
                positions: {
                    findFirst: vi.fn(() => null) // Default no position
                }
            }
        }))
    }
}));

vi.mock("./challenges", () => ({
    ChallengeManager: {
        getActiveChallenge: vi.fn()
    }
}));

vi.mock("./market", () => ({
    MarketService: {
        getLatestPrice: vi.fn(),
        isPriceFresh: vi.fn(() => true)
    }
}));

vi.mock("./risk", () => ({
    RiskEngine: {
        validateTrade: vi.fn()
    }
}));

describe("TradeExecutor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
        vi.mocked(ChallengeManager.getActiveChallenge).mockResolvedValue(mockChallenge as any);
        vi.mocked(MarketService.getLatestPrice).mockResolvedValue(mockMarketData as any);
        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: true });

        // Execute
        const result = await TradeExecutor.executeTrade("user-1", "asset-123", "BUY", 1000);

        // Verify
        expect(ChallengeManager.getActiveChallenge).toHaveBeenCalledWith("user-1");
        expect(MarketService.getLatestPrice).toHaveBeenCalledWith("asset-123");
        expect(RiskEngine.validateTrade).toHaveBeenCalledWith("challenge-123");

        // Result should match the mocked DB return
        expect(result.id).toBe("trade-123");
        expect(result.shares).toBe("1990");
    });

    it("should reject trade if balance is insufficient", async () => {
        const mockChallenge = {
            id: "challenge-123",
            currentBalance: "500", // Less than trade amount
            rulesConfig: {}
        };

        vi.mocked(ChallengeManager.getActiveChallenge).mockResolvedValue(mockChallenge as any);
        vi.mocked(MarketService.getLatestPrice).mockResolvedValue({ price: "0.50", asset_id: "a", timestamp: Date.now() } as any);

        await expect(TradeExecutor.executeTrade("user-1", "a", "BUY", 1000))
            .rejects.toThrow("Insufficient balance");
    });

    it("should reject trade if risk check fails", async () => {
        const mockChallenge = {
            id: "challenge-123",
            currentBalance: "10000",
            rulesConfig: {}
        };

        vi.mocked(ChallengeManager.getActiveChallenge).mockResolvedValue(mockChallenge as any);
        vi.mocked(MarketService.getLatestPrice).mockResolvedValue({ price: "0.50", asset_id: "a", timestamp: Date.now() } as any);
        vi.mocked(RiskEngine.validateTrade).mockResolvedValue({ allowed: false, reason: "Max Drawdown" });

        await expect(TradeExecutor.executeTrade("user-1", "a", "BUY", 1000))
            .rejects.toThrow("Risk Check Failed: Max Drawdown");
    });
});
