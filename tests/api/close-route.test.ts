/**
 * Close Route — Behavioral Tests
 *
 * Tests the POST /api/trade/close endpoint behavior:
 * - Auth: no session → 401, suspended → 403
 * - Ownership: wrong user → 403, missing position → 404
 * - Validation: missing positionId → 400
 * - Happy path: returns proceeds, pnl, phase, newBalance
 * - Evaluator: awaited for phase updates, non-blocking on failure
 * - Idempotency: duplicate key returns cached response
 *
 * MOCKING STRATEGY: Mocks auth, DB, TradeExecutor, ChallengeEvaluator,
 * MarketService, trade-idempotency. Tests the route handler's orchestration
 * logic, not the individual services (those have their own tests).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── MOCK SETUP ─────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@/auth", () => ({ auth: () => mockAuth() }));

const mockFindFirst = vi.fn();
const mockDbSelect = vi.fn();
vi.mock("@/db", () => ({
    db: {
        query: {
            positions: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
            challenges: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
        },
        select: () => ({
            from: () => ({
                where: () => mockDbSelect(),
            }),
        }),
    },
}));

vi.mock("@/db/schema", () => ({
    challenges: { id: "id", userId: "userId" },
    positions: { id: "id", challengeId: "challengeId" },
    users: { id: "id", isActive: "isActive" },
}));

vi.mock("drizzle-orm", () => ({
    eq: (...args: unknown[]) => args,
}));

const mockExecuteTrade = vi.fn();
vi.mock("@/lib/trade", () => ({
    TradeExecutor: { executeTrade: (...args: unknown[]) => mockExecuteTrade(...args) },
}));

const mockEvaluate = vi.fn();
vi.mock("@/lib/evaluator", () => ({
    ChallengeEvaluator: { evaluate: (...args: unknown[]) => mockEvaluate(...args) },
}));

const mockGetLatestPrice = vi.fn();
vi.mock("@/lib/market", () => ({
    MarketService: { getLatestPrice: (...args: unknown[]) => mockGetLatestPrice(...args) },
}));

vi.mock("@/lib/position-utils", () => ({
    getDirectionAdjustedPrice: (price: number, direction: string) =>
        direction === "NO" ? 1 - price : price,
}));

const mockCheckIdempotency = vi.fn();
const mockCacheIdempotencyResult = vi.fn();
vi.mock("@/lib/trade-idempotency", () => ({
    checkIdempotency: (...args: unknown[]) => mockCheckIdempotency(...args),
    cacheIdempotencyResult: (...args: unknown[]) => mockCacheIdempotencyResult(...args),
}));

vi.mock("@/lib/logger", () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }),
}));

// Import route handler AFTER mocks
import { POST } from "@/app/api/trade/close/route";

// ─── HELPERS ────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest("http://localhost/api/trade/close", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
    });
}

const MOCK_POSITION = {
    id: "pos-1",
    challengeId: "chal-1",
    marketId: "market-abc",
    shares: "100",
    entryPrice: "0.50",
    currentPrice: "0.60",
    sizeAmount: "50",
    direction: "YES",
    status: "OPEN",
};

const MOCK_CHALLENGE = {
    id: "chal-1",
    userId: "user-123",
    currentBalance: "9500",
    phase: "challenge",
    status: "active",
};

// ─── TESTS ──────────────────────────────────────────────────────────

describe("POST /api/trade/close", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCheckIdempotency.mockResolvedValue({ isDuplicate: false });
        mockCacheIdempotencyResult.mockResolvedValue(undefined);
    });

    // ── Auth Guards ─────────────────────────────────────────────────

    it("returns 401 when no session", async () => {
        mockAuth.mockResolvedValue(null);

        const res = await POST(makeRequest({ positionId: "pos-1" }));
        const body = await res.json();

        expect(res.status).toBe(401);
        expect(body.error).toBe("Unauthorized");
    });

    it("returns 403 when user is suspended", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-123" } });
        mockDbSelect.mockResolvedValue([{ isActive: false }]);

        const res = await POST(makeRequest({ positionId: "pos-1" }));
        const body = await res.json();

        expect(res.status).toBe(403);
        expect(body.error).toBe("Account suspended");
    });

    // ── Validation ──────────────────────────────────────────────────

    it("returns 400 when positionId is missing", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-123" } });
        mockDbSelect.mockResolvedValue([{ isActive: true }]);

        const res = await POST(makeRequest({}));
        const body = await res.json();

        expect(res.status).toBe(400);
        expect(body.error).toContain("Position ID");
    });

    // ── Ownership ───────────────────────────────────────────────────

    it("returns 404 when position doesn't exist", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-123" } });
        mockDbSelect.mockResolvedValue([{ isActive: true }]);
        mockFindFirst.mockResolvedValueOnce(null); // position not found

        const res = await POST(makeRequest({ positionId: "pos-1" }));
        const body = await res.json();

        expect(res.status).toBe(404);
    });

    it("returns 403 when position belongs to different user", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-999" } }); // different user
        mockDbSelect.mockResolvedValue([{ isActive: true }]);
        mockFindFirst
            .mockResolvedValueOnce(MOCK_POSITION)         // position found
            .mockResolvedValueOnce(MOCK_CHALLENGE);        // challenge found (userId: user-123)

        const res = await POST(makeRequest({ positionId: "pos-1" }));
        const body = await res.json();

        expect(res.status).toBe(403);
    });

    // ── Happy Path ──────────────────────────────────────────────────

    it("returns success with proceeds, pnl, and updated phase", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-123" } });
        mockDbSelect.mockResolvedValue([{ isActive: true }]);
        mockFindFirst
            .mockResolvedValueOnce(MOCK_POSITION)         // position lookup
            .mockResolvedValueOnce(MOCK_CHALLENGE)         // challenge lookup
            .mockResolvedValueOnce({                       // updated challenge after evaluator
                ...MOCK_CHALLENGE,
                currentBalance: "9560",
                phase: "challenge",
            });

        mockGetLatestPrice.mockResolvedValue({ price: "0.60" });
        mockExecuteTrade.mockResolvedValue({
            id: "trade-1",
            shares: "100",
            price: "0.60",
        });
        mockEvaluate.mockResolvedValue({ status: "active" });

        const res = await POST(makeRequest({ positionId: "pos-1" }));
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.proceeds).toBe(60); // 100 shares × $0.60
        expect(body.pnl).toBe(10);      // proceeds ($60) - costBasis ($50)
        expect(body.phase).toBe("challenge");
        expect(body.newBalance).toBe("9560");
    });

    // ── Evaluator Behavior ──────────────────────────────────────────

    it("still succeeds when evaluator throws (non-blocking)", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-123" } });
        mockDbSelect.mockResolvedValue([{ isActive: true }]);
        mockFindFirst
            .mockResolvedValueOnce(MOCK_POSITION)
            .mockResolvedValueOnce(MOCK_CHALLENGE)
            .mockResolvedValueOnce(MOCK_CHALLENGE); // fallback balance

        mockGetLatestPrice.mockResolvedValue({ price: "0.60" });
        mockExecuteTrade.mockResolvedValue({
            id: "trade-1",
            shares: "100",
            price: "0.60",
        });
        mockEvaluate.mockRejectedValue(new Error("Evaluator DB timeout"));

        const res = await POST(makeRequest({ positionId: "pos-1" }));
        const body = await res.json();

        // Trade still succeeds despite evaluator failure
        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
    });

    // ── Price Unavailable ───────────────────────────────────────────

    it("returns 503 when market price is unavailable", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-123" } });
        mockDbSelect.mockResolvedValue([{ isActive: true }]);
        mockFindFirst
            .mockResolvedValueOnce(MOCK_POSITION)
            .mockResolvedValueOnce(MOCK_CHALLENGE);

        mockGetLatestPrice.mockResolvedValue(null);

        const res = await POST(makeRequest({ positionId: "pos-1" }));
        const body = await res.json();

        expect(res.status).toBe(503);
    });

    // ── Idempotency ─────────────────────────────────────────────────

    it("returns cached response for duplicate idempotency key", async () => {
        mockAuth.mockResolvedValue({ user: { id: "user-123" } });
        mockDbSelect.mockResolvedValue([{ isActive: true }]);

        const cachedPayload = { success: true, proceeds: 60, pnl: 10 };
        mockCheckIdempotency.mockResolvedValue({
            isDuplicate: true,
            cachedResponse: cachedPayload,
        });

        const res = await POST(makeRequest({ positionId: "pos-1", idempotencyKey: "dup-key" }));
        const body = await res.json();

        expect(body).toEqual(cachedPayload);
        // TradeExecutor should NOT have been called
        expect(mockExecuteTrade).not.toHaveBeenCalled();
    });
});
