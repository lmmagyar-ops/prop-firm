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

    it("prunes resolved market with no open positions", async () => {
        const events = [mkEvent([
            { id: "mkt-resolved", price: 0.97, question: "Will X happen?" },
            { id: "mkt-active", price: 0.50, question: "Will Y happen?" },
        ])];

        const redis = createMockRedis({
            "event:active_list": JSON.stringify(events),
        });

        // No open positions for the resolved market
        mockDbSelect.mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
        });

        const result = await pruneResolvedMarkets(redis as never);

        expect(result.prunedEvents).toBe(1);
        // Redis was updated
        expect(redis.set).toHaveBeenCalled();
        // The remaining event should only have the active market
        const savedData = JSON.parse(redis.set.mock.calls[0][1] as string);
        expect(savedData[0].markets).toHaveLength(1);
        expect(savedData[0].markets[0].id).toBe("mkt-active");
    });

    it("keeps resolved market when it has open positions", async () => {
        const events = [mkEvent([
            { id: "mkt-guarded", price: 0.97, question: "Resolved but has positions" },
        ])];

        const redis = createMockRedis({
            "event:active_list": JSON.stringify(events),
        });

        // 2 open positions on this market
        mockDbSelect.mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ count: 2 }]),
            }),
        });

        const result = await pruneResolvedMarkets(redis as never);

        expect(result.prunedEvents).toBe(0);
        // Redis should NOT have been updated (no modifications)
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
        // DB should NOT have been queried (market isn't resolved)
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

    it("removes event entirely when all sub-markets pruned", async () => {
        const events = [mkEvent([
            { id: "mkt-1", price: 0.99, question: "Resolved A" },
            { id: "mkt-2", price: 0.01, question: "Resolved B" },
        ])];

        const redis = createMockRedis({
            "event:active_list": JSON.stringify(events),
        });

        mockDbSelect.mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([{ count: 0 }]),
            }),
        });

        const result = await pruneResolvedMarkets(redis as never);

        expect(result.prunedEvents).toBe(2);
        // Event with 0 remaining markets should be filtered out
        const saved = JSON.parse(redis.set.mock.calls[0][1] as string);
        expect(saved).toHaveLength(0);
    });
});
