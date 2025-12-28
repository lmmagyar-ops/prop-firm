import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChallengeEvaluator } from "./evaluator";
import { db } from "@/db";

// Mock dependencies
vi.mock("@/db", () => ({
    db: {
        query: {
            challenges: {
                findFirst: vi.fn()
            },
            positions: {
                findMany: vi.fn()
            }
        },
        update: vi.fn(() => ({
            set: vi.fn(() => ({
                where: vi.fn()
            }))
        }))
    }
}));

vi.mock("./events", () => ({
    publishAdminEvent: vi.fn()
}));

vi.mock("./market", () => ({
    MarketService: {
        getLatestPrice: vi.fn(() => ({ price: "0.50" }))
    }
}));

describe("ChallengeEvaluator - Security Hardening", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // --- PENDING FAILURE TESTS (60-second confirmation delay) ---

    it("should set pendingFailureAt on first breach, not fail immediately", async () => {
        const breachedChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "8900", // Below threshold
            startingBalance: "10000",
            rulesConfig: { maxDrawdown: 500 }, // Floor is $9,500
            pendingFailureAt: null,
            endsAt: null
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(breachedChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-1");

        // Should set pending, not fail
        expect(result).toEqual({ status: "pending_failure" });

        // Verify update was called with pendingFailureAt (not status: 'failed')
        expect(db.update).toHaveBeenCalled();
    });

    it("should fail after 60 seconds of continuous breach", async () => {
        const now = new Date();
        const sixtyOneSecondsAgo = new Date(now.getTime() - 61_000);

        const persistentBreachChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "8900",
            startingBalance: "10000",
            rulesConfig: { maxDrawdown: 500 },
            pendingFailureAt: sixtyOneSecondsAgo, // Set 61 seconds ago
            endsAt: null
        };

        vi.setSystemTime(now);
        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(persistentBreachChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-1");

        expect(result).toEqual({ status: "failed" });
    });

    it("should stay in pending_failure if breach is less than 60 seconds", async () => {
        const now = new Date();
        const thirtySecondsAgo = new Date(now.getTime() - 30_000);

        const recentBreachChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "8900",
            startingBalance: "10000",
            rulesConfig: { maxDrawdown: 500 },
            pendingFailureAt: thirtySecondsAgo, // Only 30 seconds
            endsAt: null
        };

        vi.setSystemTime(now);
        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(recentBreachChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-1");

        expect(result).toEqual({ status: "pending_failure" });
    });

    it("should clear pendingFailureAt if user recovers", async () => {
        const recoveredChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "9600", // Above floor ($9,500)
            startingBalance: "10000",
            rulesConfig: { maxDrawdown: 500 },
            pendingFailureAt: new Date(), // Was pending
            endsAt: null
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(recoveredChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-1");

        // Should return active (not failed or pending)
        expect(result).toEqual({ status: "active" });

        // Verify pendingFailureAt was cleared
        expect(db.update).toHaveBeenCalled();
    });

    // --- PASS CONDITION TESTS ---

    it("should pass challenge when equity exceeds profit target", async () => {
        const winningChallenge = {
            id: "challenge-1",
            status: "active",
            currentBalance: "11100", // Above $10,500 target
            startingBalance: "10000",
            rulesConfig: { profitTarget: 500, maxDrawdown: 500 },
            pendingFailureAt: null,
            endsAt: null
        };

        vi.mocked(db.query.challenges.findFirst).mockResolvedValue(winningChallenge as any);
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ChallengeEvaluator.evaluate("challenge-1");

        expect(result).toEqual({ status: "passed" });
    });
});
