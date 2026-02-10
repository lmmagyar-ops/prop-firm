/**
 * BalanceManager Tests
 *
 * Tests the forensic balance management system.
 * Every balance mutation (deduct/credit) must be:
 * 1. Mathematically correct
 * 2. Forensically logged (via structured logger)
 * 3. Alert on suspicious patterns (via invariants)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BalanceManager } from "@/lib/trading/BalanceManager";

// ── Mock the logger module ──────────────────────────────────────
const mockLogger = vi.hoisted(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    withContext: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
    createLogger: () => mockLogger,
}));

// ── Mock Sentry (used by invariant.ts) ──────────────────────────
vi.mock("@sentry/nextjs", () => ({
    captureMessage: vi.fn(),
}));

// ── Mock Drizzle transaction ────────────────────────────────────

function createMockTx(currentBalance: string = "10000", startingBalance: string = "10000") {
    const tx = {
        query: {
            challenges: {
                findFirst: vi.fn().mockResolvedValue({
                    id: "ch-1",
                    currentBalance,
                    startingBalance,
                }),
            },
        },
        update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(undefined),
            }),
        }),
    };
    return tx;
}

// =====================================================================
// deductCost
// =====================================================================
describe("BalanceManager.deductCost", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("deducts the correct amount from balance", async () => {
        const tx = createMockTx("10000");

        const newBalance = await BalanceManager.deductCost(tx, "ch-1", 500);

        expect(newBalance).toBe(9500);

        // Verify the DB update
        const setCall = tx.update.mock.results[0].value.set.mock.calls[0][0];
        expect(setCall.currentBalance).toBe("9500");
    });

    it("produces forensic log entry", async () => {
        const tx = createMockTx("5000");

        await BalanceManager.deductCost(tx, "ch-1", 200, "trade");

        // Should have logged via structured logger
        expect(mockLogger.info).toHaveBeenCalledWith(
            "Balance update",
            expect.objectContaining({
                operation: "DEDUCT",
                source: "trade",
            })
        );
    });

    it("warns on negative balance result", async () => {
        const tx = createMockTx("100");

        // Balance will go very negative (< -0.01) so it should throw
        await expect(
            BalanceManager.deductCost(tx, "ch-1", 500)
        ).rejects.toThrow("Balance would go negative");

        // Logger should have been called with the error
        expect(mockLogger.error).toHaveBeenCalledWith(
            "BLOCKED negative balance",
            null,
            expect.objectContaining({
                challengeId: "ch-1",
            })
        );
    });

    it("alerts on large transactions (> $10,000)", async () => {
        const tx = createMockTx("50000");

        await BalanceManager.deductCost(tx, "ch-1", 15000);

        // softInvariant fires logger.warn via the invariant module
        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining("Large balance transaction"),
            expect.objectContaining({
                amount: 15000,
            })
        );
    });

    it("throws when challenge not found", async () => {
        const tx = {
            query: {
                challenges: {
                    findFirst: vi.fn().mockResolvedValue(null),
                },
            },
            update: vi.fn(),
        };

        await expect(
            BalanceManager.deductCost(tx, "nonexistent", 100)
        ).rejects.toThrow("Challenge not found");
    });
});

// =====================================================================
// creditProceeds
// =====================================================================
describe("BalanceManager.creditProceeds", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("credits the correct amount to balance", async () => {
        const tx = createMockTx("8000");

        const newBalance = await BalanceManager.creditProceeds(tx, "ch-1", 500);

        expect(newBalance).toBe(8500);

        const setCall = tx.update.mock.results[0].value.set.mock.calls[0][0];
        expect(setCall.currentBalance).toBe("8500");
    });

    it("produces forensic log entry for CREDIT", async () => {
        const tx = createMockTx("5000");

        await BalanceManager.creditProceeds(tx, "ch-1", 300, "trade");

        expect(mockLogger.info).toHaveBeenCalledWith(
            "Balance update",
            expect.objectContaining({
                operation: "CREDIT",
                source: "trade",
            })
        );
    });

    it("alerts when credit exceeds starting balance", async () => {
        const tx = createMockTx("5000", "10000");

        await BalanceManager.creditProceeds(tx, "ch-1", 15000);

        // softInvariant fires logger.warn via the invariant module
        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining("Credit larger than starting balance"),
            expect.objectContaining({
                amount: 15000,
            })
        );
    });

    it("throws when challenge not found", async () => {
        const tx = {
            query: {
                challenges: {
                    findFirst: vi.fn().mockResolvedValue(null),
                },
            },
            update: vi.fn(),
        };

        await expect(
            BalanceManager.creditProceeds(tx, "nonexistent", 100)
        ).rejects.toThrow("Challenge not found");
    });
});

// =====================================================================
// Round-trip consistency
// =====================================================================
describe("BalanceManager round-trip", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("deduct then credit returns to original balance", async () => {
        // Simulate deduct
        const txDeduct = createMockTx("10000");
        const afterDeduct = await BalanceManager.deductCost(txDeduct, "ch-1", 500);
        expect(afterDeduct).toBe(9500);

        // Simulate credit with same amount (balance starts where deduct left off)
        const txCredit = createMockTx("9500");
        const afterCredit = await BalanceManager.creditProceeds(txCredit, "ch-1", 500);
        expect(afterCredit).toBe(10000);
    });
});
