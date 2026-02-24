/**
 * Market Integrity — Open Position Guard Tests
 *
 * Verifies that pruneResolvedMarkets() never removes markets
 * from Redis when they have open positions in the database.
 * This guard was added in the Systemic Bug Hardening (Phase 1).
 *
 * Without this guard, the "disappearing market" bug occurs:
 * market gets pruned → price feed lost → risk monitor can't compute equity.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB ─────────────────────────────────────────────────────
const mockDbSelect = vi.fn();
vi.mock("@/db", () => ({
    db: {
        select: (...args: unknown[]) => mockDbSelect(...args),
    },
}));

vi.mock("@/db/schema", () => ({
    positions: { marketId: "marketId", status: "status" },
}));

vi.mock("drizzle-orm", () => ({
    eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
    and: vi.fn((...args: unknown[]) => ({ and: args })),
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ sql: strings, values }),
}));

// ── Mock Logger ─────────────────────────────────────────────────
vi.mock("../lib/logger", () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }),
}));

// ── Import AFTER mocks ─────────────────────────────────────────
import { pruneResolvedMarkets } from "../../src/workers/market-integrity";

// ── Mock Redis ──────────────────────────────────────────────────
function createMockRedis(data: Record<string, string> = {}) {
    const store: Record<string, string> = { ...data };
    return {
        get: vi.fn(async (key: string) => store[key] || null),
        set: vi.fn(async (key: string, value: string) => { store[key] = value; }),
        ttl: vi.fn(async () => 300),
    };
}

// ── Helpers ─────────────────────────────────────────────────────
function mkEvent(markets: Array<{ id: string; price: number; question: string }>) {
    return {
        id: "event-1",
        title: "Test Event",
        slug: "test-event",
        volume: 1000,
        markets: markets.map(m => ({
            id: m.id,
            question: m.question,
            outcomes: ["Yes", "No"],
            price: m.price,
            volume: 500,
        })),
        isMultiOutcome: false,
    };
}

function mkBinaryMarket(id: string, price: number, question: string = "Test Market?") {
    return {
        id,
        question,
        volume: 500,
        outcomes: ["Yes", "No"],
        categories: ["test"],
        basePrice: price,
    };
}

// ── Setup ───────────────────────────────────────────────────────
beforeEach(() => {
    vi.clearAllMocks();
});


// =====================================================================
// PRUNE TESTS — Event Sub-Markets
// =====================================================================

describe("pruneResolvedMarkets — event sub-markets", () => {

    it("does NOT prune extreme-price event sub-markets (price ≠ settled)", async () => {
        // INVARIANT: Multi-outcome event sub-markets at ≥95%/≤5% are still tradeable
        // on Polymarket until the market actually closes via API. Pruning by price
        // alone was the Feb 22 bug (c34fccb). This test documents the correct behavior.
        const events = [mkEvent([
            { id: "mkt-extreme-high", price: 0.97, question: "Solana above 30" },
            { id: "mkt-extreme-low", price: 0.02, question: "Solana above 200" },
            { id: "mkt-active", price: 0.50, question: "Solana above 100" },
        ])];

        const redis = createMockRedis({
            "event:active_list": JSON.stringify(events),
        });

        const result = await pruneResolvedMarkets(redis as never);

        // Nothing should be pruned from event sub-markets
        expect(result.prunedEvents).toBe(0);
        // Redis should NOT have been updated (no modifications)
        expect(redis.set).not.toHaveBeenCalled();
        // DB should NOT have been queried
        expect(mockDbSelect).not.toHaveBeenCalled();
    });

    it("keeps resolved market when it has open positions", async () => {
        // This test is kept for documentation: even if we ever add event pruning back,
        // open position guard must work. For now, event sub-markets are never pruned.
        const events = [mkEvent([
            { id: "mkt-guarded", price: 0.97, question: "Resolved but has positions" },
        ])];

        const redis = createMockRedis({
            "event:active_list": JSON.stringify(events),
        });

        const result = await pruneResolvedMarkets(redis as never);

        // No event sub-markets are ever pruned by price
        expect(result.prunedEvents).toBe(0);
        // Redis should NOT have been updated
        expect(redis.set).not.toHaveBeenCalled();
    });

    it("keeps unresolved market", async () => {
        const events = [mkEvent([
            { id: "mkt-active", price: 0.50, question: "Active market" },
        ])];

        const redis = createMockRedis({
            "event:active_list": JSON.stringify(events),
        });

        const result = await pruneResolvedMarkets(redis as never);

        expect(result.prunedEvents).toBe(0);
        // DB should NOT have been queried (no pruning for event sub-markets)
        expect(mockDbSelect).not.toHaveBeenCalled();
    });
});


// =====================================================================
// PRUNE TESTS — Binary Markets
// =====================================================================

describe("pruneResolvedMarkets — binary markets", () => {

    it("prunes resolved binary market with no open positions", async () => {
        const markets = [
            mkBinaryMarket("bin-resolved", 0.03), // ≤ 0.05 → resolved
            mkBinaryMarket("bin-active", 0.45),
        ];

        const redis = createMockRedis({
            "market:active_list": JSON.stringify(markets),
        });

        mockDbSelect.mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
        });

        const result = await pruneResolvedMarkets(redis as never);

        expect(result.prunedBinary).toBe(1);
        expect(redis.set).toHaveBeenCalled();
        const saved = JSON.parse(redis.set.mock.calls[0][1] as string);
        expect(saved).toHaveLength(1);
        expect(saved[0].id).toBe("bin-active");
    });

    it("keeps resolved binary market with open positions", async () => {
        const markets = [mkBinaryMarket("bin-guarded", 0.98)];

        const redis = createMockRedis({
            "market:active_list": JSON.stringify(markets),
        });

        mockDbSelect.mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ count: 1 }]),
            }),
        });

        const result = await pruneResolvedMarkets(redis as never);

        expect(result.prunedBinary).toBe(0);
    });
});


// =====================================================================
// EDGE CASES
// =====================================================================

describe("pruneResolvedMarkets — edge cases", () => {

    it("handles empty Redis gracefully", async () => {
        const redis = createMockRedis({}); // No data in Redis

        const result = await pruneResolvedMarkets(redis as never);

        expect(result.prunedEvents).toBe(0);
        expect(result.prunedBinary).toBe(0);
        expect(mockDbSelect).not.toHaveBeenCalled();
    });

    it("does NOT prune event entirely even if all sub-markets are at extreme prices", async () => {
        // INVARIANT: Event sub-markets at extreme prices (≥95%/≤5%) are NOT pruned.
        // This is the exact scenario that caused the Feb 24 cofounder-reported bug.
        // "Solana above 30" at 99% is still tradeable — it hasn't settled.
        const events = [mkEvent([
            { id: "mkt-1", price: 0.99, question: "Solana above 30" },
            { id: "mkt-2", price: 0.01, question: "Solana above 200" },
        ])];

        const redis = createMockRedis({
            "event:active_list": JSON.stringify(events),
        });

        const result = await pruneResolvedMarkets(redis as never);

        // Neither market should be pruned
        expect(result.prunedEvents).toBe(0);
        // Redis should NOT have been written (nothing changed)
        expect(redis.set).not.toHaveBeenCalled();
        // DB should NOT have been queried
        expect(mockDbSelect).not.toHaveBeenCalled();
    });
});
