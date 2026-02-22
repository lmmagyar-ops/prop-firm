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
import { type Transaction } from "@/db/types";
import { type Mock } from "vitest";

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
// NOTE: BalanceManager.readBalance() uses tx.select().from().where() (NOT tx.query.*)
// because postgres.js relational API leaks outside transaction scope.
// See BalanceManager.ts header comment for full explanation.

function createMockTx(currentBalance: string = "10000", startingBalance: string = "10000") {
    const selectResult = [{ currentBalance, startingBalance }];
    const tx = {
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(selectResult),
            }),
        }),
        update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(undefined),
            }),
        }),
    };
    return tx as unknown as Transaction;
}

/** Helper: creates a tx mock that returns empty rows (simulates challenge not found) */
function createNotFoundTx() {
    const tx = {
        select: vi.fn().mockReturnValue({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([]),
            }),
        }),
        update: vi.fn(),
    };
    return tx as unknown as Transaction;
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
        const setCall = (tx.update as unknown as Mock).mock.results[0].value.set.mock.calls[0][0];
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
        const tx = createNotFoundTx();

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

        const setCall = (tx.update as unknown as Mock).mock.results[0].value.set.mock.calls[0][0];
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
        const tx = createNotFoundTx();

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

// =====================================================================
// adjustBalance (used by settlement service)
// =====================================================================
describe("BalanceManager.adjustBalance", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("positive delta credits correctly", async () => {
        const tx = createMockTx("10000");

        const newBalance = await BalanceManager.adjustBalance(tx, "ch-1", 500, "settlement");

        expect(newBalance).toBe(10500);

        const setCall = (tx.update as unknown as Mock).mock.results[0].value.set.mock.calls[0][0];
        expect(setCall.currentBalance).toBe("10500");
    });

    it("negative delta debits correctly", async () => {
        const tx = createMockTx("10000");

        const newBalance = await BalanceManager.adjustBalance(tx, "ch-1", -200, "fee");

        expect(newBalance).toBe(9800);
    });

    it("rejects overdraft — negative balance guard", async () => {
        const tx = createMockTx("100");

        await expect(
            BalanceManager.adjustBalance(tx, "ch-1", -15000, "fee")
        ).rejects.toThrow("Balance would go negative");

        expect(mockLogger.error).toHaveBeenCalledWith(
            "BLOCKED negative balance", null,
            expect.objectContaining({ challengeId: "ch-1" })
        );
    });

    it("produces forensic log with correct operation type", async () => {
        const tx = createMockTx("5000");

        await BalanceManager.adjustBalance(tx, "ch-1", 300, "market_settlement");

        expect(mockLogger.info).toHaveBeenCalledWith(
            "Balance update",
            expect.objectContaining({
                operation: "CREDIT",
                source: "market_settlement",
            })
        );
    });

    it("logs DEDUCT for negative delta", async () => {
        const tx = createMockTx("5000");

        await BalanceManager.adjustBalance(tx, "ch-1", -100, "fee");

        expect(mockLogger.info).toHaveBeenCalledWith(
            "Balance update",
            expect.objectContaining({
                operation: "DEDUCT",
            })
        );
    });

    it("throws when challenge not found", async () => {
        const tx = createNotFoundTx();

        await expect(
            BalanceManager.adjustBalance(tx, "nonexistent", 100, "test")
        ).rejects.toThrow("Challenge not found");
    });
});
