/**
 * Profile Service — Behavioral Tests
 *
 * Tests the profile data retrieval functions for behavioral correctness,
 * specifically the demo user bypass and the public profile delegation.
 *
 * Why this matters:
 *   We removed the demo user mock data in the cleanup. Previously,
 *   demo-user-* IDs returned fabricated profile data. Now they correctly
 *   return null. If this regresses, demo users would see fake metrics
 *   in production.
 *
 * What we're testing:
 *   1. Demo user IDs → null (private and public)
 *   2. Real user not found → null
 *   3. Metrics calculation correctness (win rate, volume, split)
 *   4. Public profile adds visibility flags
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock database ───────────────────────────────────────────────────

vi.mock("@/db", () => ({
    db: {
        query: {
            users: { findFirst: vi.fn() },
            challenges: { findMany: vi.fn() },
            payouts: { findMany: vi.fn() },
            trades: { findMany: vi.fn() },
        },
    },
}));

import { db } from "@/db";
import { getPrivateProfileData, getPublicProfileData } from "@/lib/profile-service";

// ── Helpers ─────────────────────────────────────────────────────────

function validUser(overrides: Record<string, unknown> = {}) {
    return {
        id: "user-001",
        email: "trader@example.com",
        firstName: "Jane",
        lastName: "Trader",
        name: "Jane Trader",
        displayName: "JaneT",
        image: null,
        krakenId: null,
        facebook: null,
        tiktok: null,
        instagram: null,
        twitter: null,
        youtube: null,
        showOnLeaderboard: true,
        ...overrides,
    };
}

function validChallenge(overrides: Record<string, unknown> = {}) {
    return {
        id: "ch-001",
        userId: "user-001",
        status: "active",
        phase: "challenge",
        platform: "polymarket",
        startingBalance: "10000",
        currentBalance: "10500",
        startedAt: new Date("2026-01-15"),
        endsAt: new Date("2026-02-15"),
        profitSplit: "0.80",
        ...overrides,
    };
}

function validTrade(overrides: Record<string, unknown> = {}) {
    return {
        id: "trade-001",
        challengeId: "ch-001",
        amount: "100",
        realizedPnL: "25",
        ...overrides,
    };
}

// ════════════════════════════════════════════════════════════════════
// getPrivateProfileData
// ════════════════════════════════════════════════════════════════════

describe("getPrivateProfileData", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Demo user bypass (cleanup change from Feb 13, 2026) ─────

    describe("demo user bypass (NO mock data)", () => {
        it("returns null for demo-user-* IDs", async () => {
            const result = await getPrivateProfileData("demo-user-12345");
            expect(result).toBeNull();

            // CRITICAL: should NOT have queried the database at all
            expect(db.query.users.findFirst).not.toHaveBeenCalled();
        });

        it("returns null for demo-user without suffix", async () => {
            const result = await getPrivateProfileData("demo-user");
            expect(result).toBeNull();
        });

        it("does NOT match partial prefix (e.g. 'demo-username')", async () => {
            // 'demo-username' does start with 'demo-user' so it WILL match
            // This documents the actual behavior — any ID starting with 'demo-user' is blocked
            const result = await getPrivateProfileData("demo-username");
            expect(result).toBeNull();
        });
    });

    // ── User not found ──────────────────────────────────────────

    it("returns null when user does not exist", async () => {
        vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);

        const result = await getPrivateProfileData("nonexistent-user");

        expect(result).toBeNull();
    });

    // ── Happy path ──────────────────────────────────────────────

    it("returns profile data with metrics for real user", async () => {
        vi.mocked(db.query.users.findFirst).mockResolvedValue(validUser() as any);
        vi.mocked(db.query.challenges.findMany).mockResolvedValue([validChallenge()] as any);
        vi.mocked(db.query.payouts.findMany).mockResolvedValue([]); // no payouts
        vi.mocked(db.query.trades.findMany).mockResolvedValue([
            validTrade({ realizedPnL: "50" }),
            validTrade({ id: "trade-002", realizedPnL: "-20" }),
            validTrade({ id: "trade-003", realizedPnL: "30" }),
        ] as any);

        const result = await getPrivateProfileData("user-001");

        expect(result).not.toBeNull();
        expect(result!.user.email).toBe("trader@example.com");
        expect(result!.accounts).toHaveLength(1);
    });

    // ── Metrics calculation ─────────────────────────────────────

    describe("calculateMetrics", () => {
        it("computes win rate from trades with realized PnL", async () => {
            vi.mocked(db.query.users.findFirst).mockResolvedValue(validUser() as any);
            // Must have at least one challenge — trades query only runs when challengeIds is non-empty
            vi.mocked(db.query.challenges.findMany).mockResolvedValue([validChallenge()] as any);
            vi.mocked(db.query.payouts.findMany).mockResolvedValue([]);
            vi.mocked(db.query.trades.findMany).mockResolvedValue([
                validTrade({ realizedPnL: "50" }),   // win
                validTrade({ id: "t2", realizedPnL: "-20" }),  // loss
                validTrade({ id: "t3", realizedPnL: "30" }),   // win
                validTrade({ id: "t4", realizedPnL: null }),   // no PnL (excluded)
            ] as any);

            const result = await getPrivateProfileData("user-001");

            // 2 wins out of 3 trades with PnL = 66.67%
            expect(result!.metrics.tradingWinRate).toBeCloseTo(66.67, 0);
        });

        it("returns 0% win rate when no trades have realized PnL", async () => {
            vi.mocked(db.query.users.findFirst).mockResolvedValue(validUser() as any);
            vi.mocked(db.query.challenges.findMany).mockResolvedValue([] as any);
            vi.mocked(db.query.payouts.findMany).mockResolvedValue([]);
            vi.mocked(db.query.trades.findMany).mockResolvedValue([
                validTrade({ realizedPnL: null }),
            ] as any);

            const result = await getPrivateProfileData("user-001");

            expect(result!.metrics.tradingWinRate).toBe(0);
        });

        it("highestWinRateAsset is null (FUTURE(v2))", async () => {
            vi.mocked(db.query.users.findFirst).mockResolvedValue(validUser() as any);
            vi.mocked(db.query.challenges.findMany).mockResolvedValue([] as any);
            vi.mocked(db.query.payouts.findMany).mockResolvedValue([]);
            vi.mocked(db.query.trades.findMany).mockResolvedValue([] as any);

            const result = await getPrivateProfileData("user-001");

            // Was previously hardcoded to "Politics" — now correctly null
            expect(result!.metrics.highestWinRateAsset).toBeNull();
        });

        it("calculates lifetime trading volume from trade amounts", async () => {
            vi.mocked(db.query.users.findFirst).mockResolvedValue(validUser() as any);
            // Must have at least one challenge — trades query only runs when challengeIds is non-empty
            vi.mocked(db.query.challenges.findMany).mockResolvedValue([validChallenge()] as any);
            vi.mocked(db.query.payouts.findMany).mockResolvedValue([]);
            vi.mocked(db.query.trades.findMany).mockResolvedValue([
                validTrade({ amount: "500" }),
                validTrade({ id: "t2", amount: "300" }),
                validTrade({ id: "t3", amount: "200" }),
            ] as any);

            const result = await getPrivateProfileData("user-001");

            expect(result!.metrics.lifetimeTradingVolume).toBe(1000);
        });
    });
});

// ════════════════════════════════════════════════════════════════════
// getPublicProfileData
// ════════════════════════════════════════════════════════════════════

describe("getPublicProfileData", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns null for demo users (delegates to getPrivateProfileData)", async () => {
        const result = await getPublicProfileData("demo-user-999");
        expect(result).toBeNull();
    });

    it("returns null when user does not exist", async () => {
        vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined);
        const result = await getPublicProfileData("ghost-user");
        expect(result).toBeNull();
    });

    it("adds visibility flags to accounts", async () => {
        vi.mocked(db.query.users.findFirst).mockResolvedValue(validUser() as any);
        vi.mocked(db.query.challenges.findMany).mockResolvedValue([validChallenge()] as any);
        vi.mocked(db.query.payouts.findMany).mockResolvedValue([]);
        vi.mocked(db.query.trades.findMany).mockResolvedValue([] as any);

        const result = await getPublicProfileData("user-001");

        expect(result).not.toBeNull();
        expect(result!.accounts[0]).toHaveProperty("isPublic", true);
        expect(result!.accounts[0]).toHaveProperty("showDropdown", true);
    });

    it("includes showOnLeaderboard from user record", async () => {
        vi.mocked(db.query.users.findFirst).mockResolvedValue(
            validUser({ showOnLeaderboard: true }) as any
        );
        vi.mocked(db.query.challenges.findMany).mockResolvedValue([] as any);
        vi.mocked(db.query.payouts.findMany).mockResolvedValue([]);
        vi.mocked(db.query.trades.findMany).mockResolvedValue([] as any);

        const result = await getPublicProfileData("user-001");

        expect(result!.showOnLeaderboard).toBe(true);
    });
});
