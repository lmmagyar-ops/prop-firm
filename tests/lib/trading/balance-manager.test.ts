/**
 * BalanceManager Tests
 *
 * Tests the forensic balance management system.
 * Every balance mutation (deduct/credit) must be:
 * 1. Mathematically correct
 * 2. Forensically logged
 * 3. Alert on suspicious patterns
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BalanceManager } from "@/lib/trading/BalanceManager";

// ── Mock Drizzle transaction ────────────────────────────────────

function createMockTx(currentBalance: string = "10000", rulesConfig: any = {}) {
    const tx = {
        query: {
            challenges: {
                findFirst: vi.fn().mockResolvedValue({
                    id: "ch-1",
                    currentBalance,
                    rulesConfig: { startingBalance: 10000, ...rulesConfig },
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
        vi.restoreAllMocks();
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
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
        const tx = createMockTx("5000");

        await BalanceManager.deductCost(tx, "ch-1", 200, "trade");

        // Should have logged a BALANCE_FORENSIC entry
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("[BALANCE_FORENSIC]")
        );
        const logArg = consoleSpy.mock.calls[0][0];
        expect(logArg).toContain("DEDUCT");
    });

    it("warns on negative balance result", async () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        vi.spyOn(console, "log").mockImplementation(() => { });
        const tx = createMockTx("100");

        const newBalance = await BalanceManager.deductCost(tx, "ch-1", 500);

        // Balance goes negative
        expect(newBalance).toBe(-400);

        // Should warn about negative balance
        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining("Negative balance")
        );
    });

    it("alerts on large transactions (> $10,000)", async () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        vi.spyOn(console, "log").mockImplementation(() => { });
        const tx = createMockTx("50000");

        await BalanceManager.deductCost(tx, "ch-1", 15000);

        // Should fire large transaction alert
        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining("LARGE TRANSACTION")
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
        vi.restoreAllMocks();
    });

    it("credits the correct amount to balance", async () => {
        const tx = createMockTx("8000");

        const newBalance = await BalanceManager.creditProceeds(tx, "ch-1", 500);

        expect(newBalance).toBe(8500);

        const setCall = tx.update.mock.results[0].value.set.mock.calls[0][0];
        expect(setCall.currentBalance).toBe("8500");
    });

    it("produces forensic log entry for CREDIT", async () => {
        const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
        const tx = createMockTx("5000");

        await BalanceManager.creditProceeds(tx, "ch-1", 300, "trade");

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining("[BALANCE_FORENSIC]")
        );
        const logArg = consoleSpy.mock.calls[0][0];
        expect(logArg).toContain("CREDIT");
    });

    it("alerts when credit exceeds starting balance", async () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
        vi.spyOn(console, "log").mockImplementation(() => { });
        const tx = createMockTx("5000", { startingBalance: 10000 });

        await BalanceManager.creditProceeds(tx, "ch-1", 15000);

        // Should warn: credit > starting balance
        expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining("Credit larger than starting balance")
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
        vi.restoreAllMocks();
    });

    it("deduct then credit returns to original balance", async () => {
        vi.spyOn(console, "log").mockImplementation(() => { });

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
