/**
 * Rate Limiter Tests
 *
 * Tests the pure functions (tier routing, client identification)
 * and the Redis-based rate limiting behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    getTierForPath,
    getClientIdentifier,
    checkRateLimit,
    RATE_LIMITS,
} from "@/lib/rate-limiter";

// ── Mock Redis ──────────────────────────────────────────────────

const mockRedis = {
    multi: vi.fn(),
    expire: vi.fn(),
    incr: vi.fn(),
    ttl: vi.fn(),
};

vi.mock("@/lib/redis-client", () => ({
    getRedisClient: vi.fn(() => mockRedis),
}));

// =====================================================================
// getTierForPath — Pure Function Tests
// =====================================================================

describe("getTierForPath", () => {
    it("routes /api/trade/execute to TRADE_EXECUTE", () => {
        expect(getTierForPath("/api/trade/execute")).toBe("TRADE_EXECUTE");
        expect(getTierForPath("/api/trade/close")).toBe("TRADE_EXECUTE");
    });

    it("routes /api/trade/positions to TRADE_READ", () => {
        expect(getTierForPath("/api/trade/positions")).toBe("TRADE_READ");
    });

    it("routes /api/trades/history to TRADE_READ", () => {
        expect(getTierForPath("/api/trades/history")).toBe("TRADE_READ");
    });

    it("routes /api/trade/markets to TRADE_READ", () => {
        expect(getTierForPath("/api/trade/markets/some-id")).toBe("TRADE_READ");
    });

    it("routes /api/payout to PAYOUT", () => {
        expect(getTierForPath("/api/payout/request")).toBe("PAYOUT");
    });

    it("routes auth endpoints correctly", () => {
        expect(getTierForPath("/api/auth/signup")).toBe("AUTH_SIGNUP");
        expect(getTierForPath("/api/auth/register")).toBe("AUTH_SIGNUP");
        expect(getTierForPath("/api/auth/login")).toBe("AUTH_LOGIN");
        expect(getTierForPath("/api/auth/nextauth/callback")).toBe("AUTH_LOGIN");
        expect(getTierForPath("/api/auth/verify")).toBe("AUTH_VERIFY");
        expect(getTierForPath("/api/auth/2fa")).toBe("AUTH_VERIFY");
    });

    it("routes market data to MARKETS", () => {
        expect(getTierForPath("/api/markets")).toBe("MARKETS");
        expect(getTierForPath("/api/orderbook/some-id")).toBe("MARKETS");
    });

    it("routes dashboard/user to DASHBOARD", () => {
        expect(getTierForPath("/api/dashboard")).toBe("DASHBOARD");
        expect(getTierForPath("/api/user/profile")).toBe("DASHBOARD");
    });

    it("returns DEFAULT for unknown paths", () => {
        expect(getTierForPath("/api/health")).toBe("DEFAULT");
        expect(getTierForPath("/api/admin/settings")).toBe("DEFAULT");
    });
});

// =====================================================================
// getClientIdentifier — IP Extraction
// =====================================================================

describe("getClientIdentifier", () => {
    it("extracts first IP from X-Forwarded-For (proxy chain)", () => {
        const headers = new Headers({
            "x-forwarded-for": "1.2.3.4, 10.0.0.1",
        });
        expect(getClientIdentifier(headers)).toBe("1.2.3.4");
    });

    it("uses X-Real-IP as fallback", () => {
        const headers = new Headers({
            "x-real-ip": "5.6.7.8",
        });
        expect(getClientIdentifier(headers)).toBe("5.6.7.8");
    });

    it("returns 'unknown' when no IP headers present", () => {
        const headers = new Headers();
        expect(getClientIdentifier(headers)).toBe("unknown");
    });

    it("prefers X-Forwarded-For over X-Real-IP", () => {
        const headers = new Headers({
            "x-forwarded-for": "1.2.3.4",
            "x-real-ip": "5.6.7.8",
        });
        expect(getClientIdentifier(headers)).toBe("1.2.3.4");
    });
});

// =====================================================================
// checkRateLimit — Redis Interaction
// =====================================================================

describe("checkRateLimit", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("allows requests under the limit", async () => {
        const mockPipeline = {
            incr: vi.fn(),
            ttl: vi.fn(),
            exec: vi.fn().mockResolvedValue([
                [null, 1], // incr result: count = 1
                [null, -1], // ttl result: no expiry yet
            ]),
        };
        mockRedis.multi.mockReturnValue(mockPipeline);
        mockRedis.expire.mockResolvedValue(1);

        const result = await checkRateLimit("1.2.3.4", "DEFAULT");

        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(RATE_LIMITS.DEFAULT.limit - 1);
        expect(result.tier).toBe("DEFAULT");
    });

    it("blocks requests at/over the limit", async () => {
        const mockPipeline = {
            incr: vi.fn(),
            ttl: vi.fn(),
            exec: vi.fn().mockResolvedValue([
                [null, RATE_LIMITS.TRADE_EXECUTE.limit + 1], // Over limit
                [null, 30], // 30 seconds remaining
            ]),
        };
        mockRedis.multi.mockReturnValue(mockPipeline);

        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
        const result = await checkRateLimit("1.2.3.4", "TRADE_EXECUTE");

        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.resetInSeconds).toBe(30);
        expect(consoleSpy).toHaveBeenCalled();
    });

    it("fails open when Redis pipeline returns null", async () => {
        const mockPipeline = {
            incr: vi.fn(),
            ttl: vi.fn(),
            exec: vi.fn().mockResolvedValue(null),
        };
        mockRedis.multi.mockReturnValue(mockPipeline);

        vi.spyOn(console, "warn").mockImplementation(() => { });
        const result = await checkRateLimit("1.2.3.4", "DEFAULT");

        // Should allow request (fail open)
        expect(result.allowed).toBe(true);
    });

    it("fails open when Redis throws", async () => {
        mockRedis.multi.mockImplementation(() => {
            throw new Error("Redis connection refused");
        });

        vi.spyOn(console, "error").mockImplementation(() => { });
        const result = await checkRateLimit("1.2.3.4", "DEFAULT");

        // Should allow request (fail open to not block legitimate users)
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(RATE_LIMITS.DEFAULT.limit);
    });
});

// =====================================================================
// RATE_LIMITS configuration sanity checks
// =====================================================================

describe("RATE_LIMITS config", () => {
    it("trade execution is strictest (≤ 10/min)", () => {
        expect(RATE_LIMITS.TRADE_EXECUTE.limit).toBeLessThanOrEqual(10);
    });

    it("payout is stricter than trade reads", () => {
        expect(RATE_LIMITS.PAYOUT.limit).toBeLessThan(RATE_LIMITS.TRADE_READ.limit);
    });

    it("all tiers have positive limits and windows", () => {
        for (const [, config] of Object.entries(RATE_LIMITS)) {
            expect(config.limit).toBeGreaterThan(0);
            expect(config.windowSeconds).toBeGreaterThan(0);
        }
    });
});
