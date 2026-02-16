/**
 * Polymarket Oracle — Resolution Parsing Tests
 *
 * Tests the parseResolution logic that determines whether a market
 * has resolved and who won. This is critical because settlement
 * depends on these answers to determine settlement prices.
 *
 * Tested via getResolutionStatus() which calls parseResolution internally.
 * Mocks: kvGet/kvSet (Redis cache), fetch (Gamma API).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock worker-client (Redis KV) ──────────────────────────────
const mockKvGet = vi.fn().mockResolvedValue(null);
const mockKvSet = vi.fn().mockResolvedValue(undefined);
const mockKvDel = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/worker-client", () => ({
    kvGet: (...args: unknown[]) => mockKvGet(...args),
    kvSet: (...args: unknown[]) => mockKvSet(...args),
    kvDel: (...args: unknown[]) => mockKvDel(...args),
}));

// ── Mock Logger ─────────────────────────────────────────────────
vi.mock("@/lib/logger", () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }),
}));

// ── Mock errors utility ─────────────────────────────────────────
vi.mock("@/lib/errors", () => ({
    getErrorMessage: (err: unknown) => err instanceof Error ? err.message : String(err),
}));

// ── Mock global fetch ───────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Import AFTER mocks ─────────────────────────────────────────
import { PolymarketOracle, type MarketResolution } from "@/lib/polymarket-oracle";

// ── Helpers ─────────────────────────────────────────────────────
function mkApiResponse(overrides: Record<string, unknown> = {}) {
    return {
        id: "gamma-123",
        question: "Will X happen?",
        closed: false,
        archived: false,
        accepting_orders: true,
        outcomes: JSON.stringify(["Yes", "No"]),
        outcomePrices: JSON.stringify(["0.60", "0.40"]),
        uma_resolution_status: "pending",
        resolved: false,
        ...overrides,
    };
}

function mockApiOk(marketData: Record<string, unknown>) {
    mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [marketData],
    });
}

function mockApiError(status: number) {
    mockFetch.mockResolvedValue({
        ok: false,
        status,
        json: async () => [],
    });
}

// ── Setup ───────────────────────────────────────────────────────
beforeEach(() => {
    vi.clearAllMocks();
    mockKvGet.mockResolvedValue(null); // No cache
});


// =====================================================================
// RESOLUTION DETECTION
// =====================================================================

describe("PolymarketOracle.getResolutionStatus", () => {

    it("detects explicitly closed market as resolved", async () => {
        mockApiOk(mkApiResponse({ closed: true }));

        const result = await PolymarketOracle.getResolutionStatus("token-123");

        expect(result.isResolved).toBe(true);
        expect(result.isClosed).toBe(true);
        expect(result.source).toBe("api");
    });

    it("detects UMA-resolved market", async () => {
        mockApiOk(mkApiResponse({
            uma_resolution_status: "resolved",
            outcomePrices: JSON.stringify(["0.98", "0.02"]),
        }));

        const result = await PolymarketOracle.getResolutionStatus("token-uma");

        expect(result.isResolved).toBe(true);
    });

    it("detects YES win from prices + not accepting orders", async () => {
        mockApiOk(mkApiResponse({
            accepting_orders: false,
            outcomePrices: JSON.stringify(["0.98", "0.02"]),
        }));

        const result = await PolymarketOracle.getResolutionStatus("token-yes-win");

        expect(result.isResolved).toBe(true);
        expect(result.resolutionPrice).toBe(1);
        expect(result.winningOutcome).toBe("Yes");
    });

    it("detects NO win from prices + not accepting orders", async () => {
        mockApiOk(mkApiResponse({
            accepting_orders: false,
            outcomePrices: JSON.stringify(["0.02", "0.98"]),
        }));

        const result = await PolymarketOracle.getResolutionStatus("token-no-win");

        expect(result.isResolved).toBe(true);
        expect(result.resolutionPrice).toBe(0);
        expect(result.winningOutcome).toBe("No");
    });

    it("returns not resolved for active market", async () => {
        mockApiOk(mkApiResponse({
            outcomePrices: JSON.stringify(["0.60", "0.40"]),
            accepting_orders: true,
        }));

        const result = await PolymarketOracle.getResolutionStatus("token-active");

        expect(result.isResolved).toBe(false);
        expect(result.isClosed).toBe(false);
    });

    it("does not report resolution from prices alone (accepting orders)", async () => {
        // Price at 0.98 but still accepting orders → not resolved
        mockApiOk(mkApiResponse({
            accepting_orders: true,
            outcomePrices: JSON.stringify(["0.98", "0.02"]),
        }));

        const result = await PolymarketOracle.getResolutionStatus("token-high-price");

        expect(result.isResolved).toBe(false);
    });

    it("handles missing outcomePrices gracefully", async () => {
        mockApiOk(mkApiResponse({
            outcomePrices: undefined,
            outcomes: undefined,
        }));

        const result = await PolymarketOracle.getResolutionStatus("token-no-prices");

        // Should not crash, resolution based on closed/UMA status only
        expect(result.isResolved).toBe(false);
        expect(result.resolutionPrice).toBeUndefined();
    });

    it("handles malformed JSON in outcomePrices without crash", async () => {
        mockApiOk(mkApiResponse({
            outcomePrices: "not-valid-json",
        }));

        const result = await PolymarketOracle.getResolutionStatus("token-bad-json");

        expect(result.isResolved).toBe(false);
        expect(result.source).toBe("api");
    });

    it("returns fallback when API returns error", async () => {
        mockApiError(500);

        const result = await PolymarketOracle.getResolutionStatus("token-api-err");

        expect(result.isResolved).toBe(false);
        expect(result.source).toBe("fallback");
    });

    it("returns fallback when fetch throws", async () => {
        mockFetch.mockRejectedValue(new Error("Network timeout"));

        const result = await PolymarketOracle.getResolutionStatus("token-network");

        expect(result.isResolved).toBe(false);
        expect(result.source).toBe("fallback");
    });

    it("returns cached result when available", async () => {
        const cached: MarketResolution = {
            marketId: "token-cached",
            isResolved: true,
            isClosed: true,
            winningOutcome: "Yes",
            resolutionPrice: 1,
            source: "api",
            checkedAt: new Date(),
        };
        mockKvGet.mockResolvedValue(JSON.stringify(cached));

        const result = await PolymarketOracle.getResolutionStatus("token-cached");

        expect(result.isResolved).toBe(true);
        expect(result.source).toBe("cache");
        // Should NOT have called fetch
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it("caches result after API call", async () => {
        mockApiOk(mkApiResponse({ closed: true }));

        await PolymarketOracle.getResolutionStatus("token-to-cache");

        expect(mockKvSet).toHaveBeenCalledWith(
            "oracle:resolution:token-to-cache",
            expect.any(String),
            300 // TTL
        );
    });
});


// =====================================================================
// BATCH RESOLUTION
// =====================================================================

describe("PolymarketOracle.batchGetResolutionStatus", () => {

    it("resolves multiple tokens", async () => {
        // Each call to getResolutionStatus triggers a separate fetch
        mockFetch
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [mkApiResponse({ closed: true })],
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => [mkApiResponse({ closed: false, accepting_orders: true })],
            });

        const results = await PolymarketOracle.batchGetResolutionStatus(["t1", "t2"]);

        expect(results.size).toBe(2);
        expect(results.get("t1")!.isResolved).toBe(true);
        expect(results.get("t2")!.isResolved).toBe(false);
    });
});


// =====================================================================
// isTradeable
// =====================================================================

describe("PolymarketOracle.isTradeable", () => {

    it("returns true for active market", async () => {
        mockApiOk(mkApiResponse({ closed: false, accepting_orders: true }));

        const tradeable = await PolymarketOracle.isTradeable("token-open");

        expect(tradeable).toBe(true);
    });

    it("returns false for closed market", async () => {
        mockApiOk(mkApiResponse({ closed: true }));

        const tradeable = await PolymarketOracle.isTradeable("token-closed");

        expect(tradeable).toBe(false);
    });
});
