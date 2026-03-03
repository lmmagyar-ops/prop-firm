/**
 * Trade Idempotency Guard — Behavioral Tests
 *
 * Tests the BEHAVIOR of the idempotency guard that prevents double-spending:
 * 1. First request with a new key → proceeds (isDuplicate: false)
 * 2. Second request with same key → blocked (isDuplicate: true + cached response)
 * 3. Worker failure → fail CLOSED (isDuplicate: true — blocks trade)
 * 4. In-flight duplicate → returns { inProgress: true }
 * 5. Corrupted cache → fails safe (isDuplicate: false — allows retry)
 * 6. Cache write-through stores response for future duplicates
 *
 * MOCKING STRATEGY: We mock @/lib/worker-client (the Redis boundary)
 * because idempotency is pure logic over kv operations. Testing the
 * actual Redis connection belongs in the worker's test suite.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkIdempotency, cacheIdempotencyResult } from "@/lib/trade-idempotency";

// ─── MOCK WORKER-CLIENT ────────────────────────────────────────────
const mockKvSetNx = vi.fn();
const mockKvGet = vi.fn();
const mockKvSet = vi.fn();

vi.mock("@/lib/worker-client", () => ({
    kvSetNx: (...args: unknown[]) => mockKvSetNx(...args),
    kvGet: (...args: unknown[]) => mockKvGet(...args),
    kvSet: (...args: unknown[]) => mockKvSet(...args),
}));

vi.mock("@/lib/logger", () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }),
}));

// ─── TESTS ─────────────────────────────────────────────────────────

describe("Trade Idempotency Guard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── Core Happy Path ────────────────────────────────────────────

    it("first request with new key proceeds (isDuplicate: false)", async () => {
        // kvSetNx returns true → we claimed the lock
        mockKvSetNx.mockResolvedValue(true);

        const result = await checkIdempotency("uuid-first-call");

        expect(result.isDuplicate).toBe(false);
        expect(mockKvSetNx).toHaveBeenCalledWith(
            "trade:idem:uuid-first-call",
            expect.stringContaining("pending"),
            60
        );
    });

    it("second request with same key returns cached response", async () => {
        // kvSetNx returns false → lock already held
        mockKvSetNx.mockResolvedValue(false);
        // kvGet returns the cached trade result
        mockKvGet.mockResolvedValue(
            JSON.stringify({ status: "completed", tradeId: "trade-123" })
        );

        const result = await checkIdempotency("uuid-duplicate");

        expect(result.isDuplicate).toBe(true);
        expect(result.cachedResponse).toEqual({
            status: "completed",
            tradeId: "trade-123",
        });
    });

    // ── In-Flight Detection ────────────────────────────────────────

    it("returns inProgress when original request is still executing", async () => {
        // Lock exists but value is still "pending" (first request hasn't finished)
        mockKvSetNx.mockResolvedValue(false);
        mockKvGet.mockResolvedValue(JSON.stringify({ status: "pending" }));

        const result = await checkIdempotency("uuid-inflight");

        expect(result.isDuplicate).toBe(true);
        expect(result.cachedResponse).toEqual({ inProgress: true });
    });

    // ── Fail-Closed Behavior (CRITICAL for financial safety) ───────

    it("FAILS CLOSED when worker is unreachable — blocks trade", async () => {
        // kvSetNx throws (worker down)
        mockKvSetNx.mockRejectedValue(new Error("Worker unreachable"));

        const result = await checkIdempotency("uuid-worker-down");

        // MUST return isDuplicate: true to prevent double-execution
        expect(result.isDuplicate).toBe(true);
        expect(result.cachedResponse).toEqual({
            error: "Service temporarily unavailable. Please try again.",
        });
    });

    // ── Edge Cases ─────────────────────────────────────────────────

    it("handles corrupted cache gracefully — allows retry", async () => {
        // Lock exists but cached data is corrupted JSON
        mockKvSetNx.mockResolvedValue(false);
        mockKvGet.mockResolvedValue("not-valid-json{{{");

        const result = await checkIdempotency("uuid-corrupted");

        // Corrupted cache → safe to retry (isDuplicate: false)
        expect(result.isDuplicate).toBe(false);
    });

    it("handles null cache value — allows retry", async () => {
        // Lock exists but kvGet returns null (shouldn't happen, but defensive)
        mockKvSetNx.mockResolvedValue(false);
        mockKvGet.mockResolvedValue(null);

        const result = await checkIdempotency("uuid-null-cache");

        // No data despite lock → proceed cautiously
        expect(result.isDuplicate).toBe(false);
    });

    // ── Cache Write-Through ────────────────────────────────────────

    it("cacheIdempotencyResult stores response under the key", async () => {
        mockKvSet.mockResolvedValue(true);

        const response = { tradeId: "trade-456", shares: 10 };
        await cacheIdempotencyResult("uuid-cache-write", response);

        expect(mockKvSet).toHaveBeenCalledWith(
            "trade:idem:uuid-cache-write",
            JSON.stringify(response),
            60
        );
    });

    it("cacheIdempotencyResult swallows write errors silently", async () => {
        // Cache write fails — this is non-critical, so it should NOT throw
        mockKvSet.mockRejectedValue(new Error("Redis write failed"));

        // Should not throw
        await expect(
            cacheIdempotencyResult("uuid-write-fail", { tradeId: "trade-789" })
        ).resolves.toBeUndefined();
    });
});
