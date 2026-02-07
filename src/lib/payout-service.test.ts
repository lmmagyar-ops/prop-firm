import { describe, it, expect, vi, beforeEach } from "vitest";
import { PayoutService } from "./payout-service";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock dependencies
vi.mock("@/db", () => ({
    db: {
        select: vi.fn(() => ({
            from: vi.fn(() => ({
                where: vi.fn()
            }))
        })),
        insert: vi.fn(() => ({
            values: vi.fn()
        })),
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn()
            }))
        }))
    }
}));

vi.mock("./resolution-detector", () => ({
    ResolutionDetector: {
        getExcludedPnL: vi.fn()
    }
}));

vi.mock("nanoid", () => ({
    nanoid: vi.fn(() => "test-payout-id-123")
}));

// Import after mocking
import { db } from "@/db";
import { ResolutionDetector } from "./resolution-detector";

describe("PayoutService.checkEligibility", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return eligible=true when all conditions met", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "funded",
            status: "active",
            currentBalance: "11000",      // $1000 profit
            startingBalance: "10000",
            activeTradingDays: 5,         // Meets minimum
            consistencyFlagged: false
        };

        // First call returns challenge, second call returns empty payouts (no pending)
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn()
                    .mockResolvedValueOnce([mockChallenge])  // checkEligibility: challenge lookup
                    .mockResolvedValueOnce([])               // checkEligibility: pending payout check
            })
        } as any);

        const result = await PayoutService.checkEligibility("challenge-1");

        expect(result.eligible).toBe(true);
        expect(result.reasons).toHaveLength(0);
        expect(result.netProfit).toBe(1000);
        expect(result.activeTradingDays).toBe(5);
    });

    it("should return eligible=false if phase is not funded", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "challenge",  // NOT funded
            status: "active",
            currentBalance: "11000",
            startingBalance: "10000",
            activeTradingDays: 5
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        const result = await PayoutService.checkEligibility("challenge-1");

        expect(result.eligible).toBe(false);
        expect(result.reasons).toContainEqual(expect.stringContaining("Not a funded account"));
    });

    it("should return eligible=false if net profit <= 0", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "funded",
            status: "active",
            currentBalance: "9500",       // $500 loss
            startingBalance: "10000",
            activeTradingDays: 5
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        const result = await PayoutService.checkEligibility("challenge-1");

        expect(result.eligible).toBe(false);
        expect(result.reasons).toContainEqual(expect.stringContaining("No net profit"));
    });

    it("should return eligible=false if trading days < 5", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "funded",
            status: "active",
            currentBalance: "11000",
            startingBalance: "10000",
            activeTradingDays: 3          // Less than 5
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        const result = await PayoutService.checkEligibility("challenge-1");

        expect(result.eligible).toBe(false);
        expect(result.reasons).toContainEqual(expect.stringContaining("Insufficient trading days"));
        expect(result.reasons).toContainEqual(expect.stringContaining("3/5"));
    });

    it("should still be eligible if consistency flagged (soft flag)", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "funded",
            status: "active",
            currentBalance: "11000",
            startingBalance: "10000",
            activeTradingDays: 5,
            consistencyFlagged: true      // Flagged but NOT blocking
        };

        // First call returns challenge, second call returns empty payouts (no pending)
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn()
                    .mockResolvedValueOnce([mockChallenge])  // checkEligibility: challenge lookup
                    .mockResolvedValueOnce([])               // checkEligibility: pending payout check
            })
        } as any);

        const result = await PayoutService.checkEligibility("challenge-1");

        // Should be eligible because consistency is a soft flag
        expect(result.eligible).toBe(true);
        expect(result.consistencyFlagged).toBe(true);
        expect(result.reasons).toContainEqual(expect.stringContaining("Consistency flag"));
    });

    it("should return eligible=false if account not active", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "funded",
            status: "failed",             // NOT active
            currentBalance: "11000",
            startingBalance: "10000",
            activeTradingDays: 5
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        const result = await PayoutService.checkEligibility("challenge-1");

        expect(result.eligible).toBe(false);
        expect(result.reasons).toContainEqual(expect.stringContaining("not active"));
    });

    it("should return eligible=false if challenge not found", async () => {
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([])
            })
        } as any);

        const result = await PayoutService.checkEligibility("nonexistent");

        expect(result.eligible).toBe(false);
        expect(result.reasons).toContainEqual(expect.stringContaining("not found"));
    });
});

describe("PayoutService.calculatePayout", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should apply 80% profit split correctly", async () => {
        const mockChallenge = {
            id: "challenge-1",
            currentBalance: "11000",      // $1000 gross profit
            startingBalance: "10000",
            payoutCap: "10000",
            profitSplit: "0.80"
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        vi.mocked(ResolutionDetector.getExcludedPnL).mockResolvedValue({ totalExcluded: 0, excludedPositions: [] });

        const result = await PayoutService.calculatePayout("challenge-1");

        expect(result.grossProfit).toBe(1000);
        expect(result.netPayout).toBe(800);    // 80% of $1000
        expect(result.firmShare).toBe(200);     // 20% of $1000
        expect(result.profitSplit).toBe(0.80);
    });

    it("should enforce payout cap", async () => {
        const mockChallenge = {
            id: "challenge-1",
            currentBalance: "22000",      // $12000 gross profit
            startingBalance: "10000",
            payoutCap: "10000",           // Cap to $10000
            profitSplit: "0.80"
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        vi.mocked(ResolutionDetector.getExcludedPnL).mockResolvedValue({ totalExcluded: 0, excludedPositions: [] });

        const result = await PayoutService.calculatePayout("challenge-1");

        expect(result.grossProfit).toBe(12000);
        expect(result.cappedProfit).toBe(10000);   // Capped at $10k
        expect(result.netPayout).toBe(8000);       // 80% of $10k
    });

    it("should exclude resolution-related profits", async () => {
        const mockChallenge = {
            id: "challenge-1",
            currentBalance: "11500",      // $1500 gross profit
            startingBalance: "10000",
            payoutCap: "10000",
            profitSplit: "0.80",
            payoutCycleStart: new Date("2025-01-01")
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        // $300 excluded from resolution events
        vi.mocked(ResolutionDetector.getExcludedPnL).mockResolvedValue({ totalExcluded: 300, excludedPositions: [{ positionId: 'pos-1', marketId: 'mkt-1', pnl: 300, reason: 'Resolution' }] });

        const result = await PayoutService.calculatePayout("challenge-1");

        expect(result.grossProfit).toBe(1500);
        expect(result.excludedPnl).toBe(300);
        expect(result.adjustedProfit).toBe(1200);  // 1500 - 300
        expect(result.netPayout).toBe(960);        // 80% of $1200
    });

    it("should calculate firm share correctly", async () => {
        const mockChallenge = {
            id: "challenge-1",
            currentBalance: "11000",
            startingBalance: "10000",
            payoutCap: "10000",
            profitSplit: "0.80"
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        vi.mocked(ResolutionDetector.getExcludedPnL).mockResolvedValue({ totalExcluded: 0, excludedPositions: [] });

        const result = await PayoutService.calculatePayout("challenge-1");

        expect(result.firmShare).toBe(200);   // 20% of $1000
        expect(result.netPayout + result.firmShare).toBe(result.cappedProfit);
    });

    it("should handle no profit (zero payout)", async () => {
        const mockChallenge = {
            id: "challenge-1",
            currentBalance: "9500",       // Loss
            startingBalance: "10000",
            payoutCap: "10000",
            profitSplit: "0.80"
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        vi.mocked(ResolutionDetector.getExcludedPnL).mockResolvedValue({ totalExcluded: 0, excludedPositions: [] });

        const result = await PayoutService.calculatePayout("challenge-1");

        expect(result.grossProfit).toBe(0);
        expect(result.netPayout).toBe(0);
    });

    it("should throw if challenge not found", async () => {
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([])
            })
        } as any);

        await expect(PayoutService.calculatePayout("nonexistent"))
            .rejects.toThrow("Challenge not found");
    });
});

describe("PayoutService.requestPayout", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should throw if not eligible (insufficient days)", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "funded",
            status: "active",
            currentBalance: "11000",
            startingBalance: "10000",
            activeTradingDays: 2,        // Less than 5
            payoutCap: "10000",
            profitSplit: "0.80"
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        await expect(PayoutService.requestPayout("challenge-1", "0x123", "POLYGON"))
            .rejects.toThrow("not eligible");
    });

    it("should throw if no net profit", async () => {
        const mockChallenge = {
            id: "challenge-1",
            phase: "funded",
            status: "active",
            currentBalance: "9500",       // Loss
            startingBalance: "10000",
            activeTradingDays: 5,
            payoutCap: "10000",
            profitSplit: "0.80"
        };

        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([mockChallenge])
            })
        } as any);

        await expect(PayoutService.requestPayout("challenge-1", "0x123", "POLYGON"))
            .rejects.toThrow("not eligible");
    });
});

describe("PayoutService State Transitions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("approvePayout sets status to approved", async () => {
        // Mock the pre-check SELECT (returns pending payout)
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ id: "payout-123", status: "pending" }])
            })
        } as any);

        await PayoutService.approvePayout("payout-123", "admin-1");

        expect(db.update).toHaveBeenCalled();
    });

    it("approvePayout throws if payout is not pending", async () => {
        // Mock the pre-check SELECT (returns already approved payout)
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ id: "payout-123", status: "completed" }])
            })
        } as any);

        await expect(PayoutService.approvePayout("payout-123", "admin-1"))
            .rejects.toThrow("Cannot approve");
    });

    it("markProcessing sets status to processing", async () => {
        // Mock the pre-check SELECT (returns approved payout)
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ id: "payout-123", status: "approved" }])
            })
        } as any);

        await PayoutService.markProcessing("payout-123");

        expect(db.update).toHaveBeenCalled();
    });

    it("markProcessing throws if payout is not approved", async () => {
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ id: "payout-123", status: "pending" }])
            })
        } as any);

        await expect(PayoutService.markProcessing("payout-123"))
            .rejects.toThrow("Cannot process");
    });

    it("completePayout updates balance and records transaction", async () => {
        const mockPayout = {
            id: "payout-123",
            challengeId: "challenge-1",
            amount: "800",
            status: "processing"
        };

        const mockChallenge = {
            id: "challenge-1",
            totalPaidOut: "0"
        };

        // First select returns payout (with status guard), second returns challenge
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn()
                    .mockResolvedValueOnce([mockPayout])
                    .mockResolvedValueOnce([mockChallenge])
            })
        } as any);

        await PayoutService.completePayout("payout-123", "0x123abc...hash");

        // Verify update was called for both challenge and payout
        expect(db.update).toHaveBeenCalled();
    });

    it("completePayout throws if payout is not processing", async () => {
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([])  // No match = wrong status
            })
        } as any);

        await expect(PayoutService.completePayout("payout-123", "0xhash"))
            .rejects.toThrow("not found or not in 'processing'");
    });

    it("failPayout records failure reason", async () => {
        // Mock the pre-check SELECT (returns pending payout)
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ id: "payout-123", status: "pending" }])
            })
        } as any);

        await PayoutService.failPayout("payout-123", "Transaction rejected");

        expect(db.update).toHaveBeenCalled();
    });

    it("failPayout throws if payout is already completed", async () => {
        vi.mocked(db.select).mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ id: "payout-123", status: "completed" }])
            })
        } as any);

        await expect(PayoutService.failPayout("payout-123", "Too late"))
            .rejects.toThrow("already terminal");
    });
});

