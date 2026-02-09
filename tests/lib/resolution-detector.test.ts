/**
 * Resolution Detector Tests
 *
 * Tests the oracle-first, heuristic-fallback resolution detection system.
 * Ensures:
 * 1. Oracle is primary source for resolution status
 * 2. Falls back to price heuristic when oracle unavailable
 * 3. Error handling returns safe "not resolved" defaults
 * 4. Excluded P&L calculation is correct for payout fairness
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ResolutionDetector } from "@/lib/resolution-detector";

// ── Mock dependencies ───────────────────────────────────────────

vi.mock("@/db", () => ({
    db: {
        query: {
            positions: {
                findMany: vi.fn(),
            },
        },
    },
}));

vi.mock("@/lib/polymarket-oracle", () => ({
    PolymarketOracle: {
        getResolutionStatus: vi.fn(),
    },
}));

vi.mock("@/lib/funded-rules", () => ({
    RESOLUTION_CONFIG: {
        maxMovePercent: 0.80,
    },
    FUNDED_RULES: {},
}));

import { db } from "@/db";
import { PolymarketOracle } from "@/lib/polymarket-oracle";

// =====================================================================
// isResolutionEvent — Oracle Primary
// =====================================================================

describe("ResolutionDetector.isResolutionEvent", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("uses oracle as primary source when available", async () => {
        vi.mocked(PolymarketOracle.getResolutionStatus).mockResolvedValue({
            marketId: "mkt-1",
            isResolved: true,
            isClosed: true,
            resolutionPrice: 1.0,
            source: "api",
            checkedAt: new Date("2024-01-15"),
            winningOutcome: "YES",
        });

        const result = await ResolutionDetector.isResolutionEvent("mkt-1");

        expect(result.isResolution).toBe(true);
        expect(result.source).toBe("oracle");
        expect(result.winningOutcome).toBe("YES");
    });

    it("returns not resolved when oracle says market is active", async () => {
        vi.mocked(PolymarketOracle.getResolutionStatus).mockResolvedValue({
            marketId: "mkt-active",
            isResolved: false,
            isClosed: false,
            source: "api",
            checkedAt: new Date(),
        });

        const result = await ResolutionDetector.isResolutionEvent("mkt-active");

        expect(result.isResolution).toBe(false);
        expect(result.source).toBe("oracle");
    });

    it("falls back to heuristic when oracle returns fallback source", async () => {
        vi.mocked(PolymarketOracle.getResolutionStatus).mockResolvedValue({
            marketId: "mkt-fallback",
            isResolved: false,
            isClosed: false,
            source: "fallback",
            checkedAt: new Date(),
        });

        // Mock MarketService dynamically imported by legacyPriceHeuristic
        vi.doMock("@/lib/market", () => ({
            MarketService: {
                getLatestPrice: vi.fn().mockResolvedValue({ price: "0.98" }),
            },
        }));

        const result = await ResolutionDetector.isResolutionEvent("mkt-fallback");

        expect(result.source).toBe("heuristic");
        // 0.98 > 0.95, so should detect as resolved
        expect(result.isResolution).toBe(true);
    });

    it("returns safe default on error (not resolved)", async () => {
        vi.mocked(PolymarketOracle.getResolutionStatus).mockRejectedValue(
            new Error("Network unreachable")
        );

        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        const result = await ResolutionDetector.isResolutionEvent("mkt-error");

        expect(result.isResolution).toBe(false);
        expect(result.source).toBe("heuristic");
        expect(consoleSpy).toHaveBeenCalled();
    });
});

// =====================================================================
// getExcludedPnL — Payout Fairness
// =====================================================================

describe("ResolutionDetector.getExcludedPnL", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("excludes P&L from resolved positions", async () => {
        // Mock two closed positions: one resolved, one not
        vi.mocked(db.query.positions.findMany).mockResolvedValue([
            { id: "pos-1", marketId: "resolved-mkt", pnl: "500", status: "CLOSED" },
            { id: "pos-2", marketId: "normal-mkt", pnl: "300", status: "CLOSED" },
        ] as any);

        // Oracle: first market resolved, second active
        vi.mocked(PolymarketOracle.getResolutionStatus)
            .mockResolvedValueOnce({
                marketId: "resolved-mkt",
                isResolved: true,
                isClosed: true,
                resolutionPrice: 1.0,
                source: "api",
                checkedAt: new Date(),
                winningOutcome: "YES",
            })
            .mockResolvedValueOnce({
                marketId: "normal-mkt",
                isResolved: false,
                isClosed: false,
                source: "api",
                checkedAt: new Date(),
            });

        const result = await ResolutionDetector.getExcludedPnL("ch-1");

        // Only the resolved position's P&L should be excluded
        expect(result.totalExcluded).toBe(500);
        expect(result.excludedPositions).toHaveLength(1);
        expect(result.excludedPositions[0].positionId).toBe("pos-1");
        expect(result.excludedPositions[0].pnl).toBe(500);
    });

    it("returns zero excluded when no positions are resolved", async () => {
        vi.mocked(db.query.positions.findMany).mockResolvedValue([
            { id: "pos-1", marketId: "mkt-1", pnl: "200", status: "CLOSED" },
        ] as any);

        vi.mocked(PolymarketOracle.getResolutionStatus).mockResolvedValue({
            marketId: "mkt-1",
            isResolved: false,
            isClosed: false,
            source: "api",
            checkedAt: new Date(),
        });

        const result = await ResolutionDetector.getExcludedPnL("ch-1");

        expect(result.totalExcluded).toBe(0);
        expect(result.excludedPositions).toHaveLength(0);
    });

    it("handles empty positions (no closed positions in cycle)", async () => {
        vi.mocked(db.query.positions.findMany).mockResolvedValue([]);

        const result = await ResolutionDetector.getExcludedPnL("ch-1");

        expect(result.totalExcluded).toBe(0);
        expect(result.excludedPositions).toHaveLength(0);
    });

    it("handles DB error gracefully (returns empty result)", async () => {
        vi.mocked(db.query.positions.findMany).mockRejectedValue(
            new Error("DB connection lost")
        );

        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        const result = await ResolutionDetector.getExcludedPnL("ch-1");

        expect(result.totalExcluded).toBe(0);
        expect(result.excludedPositions).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalled();
    });
});

// =====================================================================
// getResolutionEventsForChallenge
// =====================================================================

describe("ResolutionDetector.getResolutionEventsForChallenge", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("deduplicates markets (same market in multiple positions)", async () => {
        vi.mocked(db.query.positions.findMany).mockResolvedValue([
            { id: "pos-1", marketId: "mkt-shared" },
            { id: "pos-2", marketId: "mkt-shared" }, // Duplicate
            { id: "pos-3", marketId: "mkt-other" },
        ] as any);

        vi.mocked(PolymarketOracle.getResolutionStatus)
            .mockResolvedValueOnce({
                marketId: "mkt-shared",
                isResolved: true,
                isClosed: true,
                resolutionPrice: 1.0,
                source: "api",
                checkedAt: new Date(),
                winningOutcome: "YES",
            })
            .mockResolvedValueOnce({
                marketId: "mkt-other",
                isResolved: false,
                isClosed: false,
                source: "api",
                checkedAt: new Date(),
            });

        const events = await ResolutionDetector.getResolutionEventsForChallenge("ch-1");

        // Should only check 2 unique markets, not 3
        expect(PolymarketOracle.getResolutionStatus).toHaveBeenCalledTimes(2);
        // Only the resolved market should be in events
        expect(events).toHaveLength(1);
        expect(events[0].marketId).toBe("mkt-shared");
    });
});
