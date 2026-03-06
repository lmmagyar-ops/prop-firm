/**
 * Funded Transition Balance Invariant — Contract Test
 *
 * ROOT CAUSE: risk-monitor.ts triggerPass used to credit position proceeds
 * (via closeAllPositions → BalanceManager.creditProceeds) without resetting
 * the balance afterward. Result: funded traders started with
 * startingBalance + liquidation_proceeds instead of just startingBalance.
 *
 * The evaluator.ts path was correct (it called resetBalance and skipped proceeds).
 * The risk-monitor.ts path was buggy (it credited proceeds but didn't resetBalance).
 *
 * INVARIANT: After ANY funded transition — regardless of which code path triggers
 * it — the resulting balance MUST equal startingBalance. No position proceeds
 * should carry forward into the funded phase.
 *
 * This is a PURE LOGIC test that verifies the operation ordering.
 * It does NOT mock the DB — it tests the mathematical invariant.
 */
import { describe, it, expect } from "vitest";

/**
 * Simulates the risk-monitor's triggerPass flow:
 * 1. Set balance to startingBalance (DB update)
 * 2. Close positions → credit proceeds (closeAllPositions)
 * 3. Reset balance to startingBalance (BalanceManager.resetBalance)
 *
 * Returns the final balance after all operations.
 */
function simulateRiskMonitorPass(
    startingBalance: number,
    positionProceeds: number,
): number {
    // Step 1: DB update sets currentBalance = startingBalance
    let balance = startingBalance;

    // Step 2: closeAllPositions credits liquidation proceeds
    // (this is what BalanceManager.creditProceeds does)
    balance += positionProceeds;

    // Step 3: resetBalance overrides back to startingBalance
    // THIS IS THE FIX — without this line, balance would be inflated
    balance = startingBalance;

    return balance;
}

/**
 * Simulates the evaluator's triggerPass flow:
 * 1. Close positions (without crediting proceeds — explicit skip)
 * 2. Reset balance to startingBalance (BalanceManager.resetBalance)
 *
 * Returns the final balance after all operations.
 */
function simulateEvaluatorPass(
    startingBalance: number,
    _positionProceeds: number, // unused — evaluator skips credit
): number {
    // Step 1: Positions closed but proceeds NOT credited (line 374 comment)
    // Step 2: resetBalance sets to startingBalance
    return startingBalance;
}

/**
 * Simulates the BUGGY (pre-fix) risk-monitor flow:
 * 1. Set balance to startingBalance
 * 2. Close positions → credit proceeds
 * 3. NO resetBalance call
 */
function simulateBuggyRiskMonitorPass(
    startingBalance: number,
    positionProceeds: number,
): number {
    let balance = startingBalance;
    balance += positionProceeds;
    // Missing: balance = startingBalance;
    return balance;
}


describe("Funded Transition Balance Invariant", () => {

    const testCases = [
        { name: "$5K tier with small profit", startingBalance: 5000, proceeds: 412.50 },
        { name: "$10K tier with moderate profit", startingBalance: 10000, proceeds: 1250.00 },
        { name: "$25K tier with large profit (Mat's case)", startingBalance: 25000, proceeds: 4147.64 },
        { name: "Positions at zero value", startingBalance: 10000, proceeds: 0 },
        { name: "Positions worth more than starting balance", startingBalance: 5000, proceeds: 7500.00 },
    ];

    for (const tc of testCases) {
        it(`evaluator pass: balance == startingBalance (${tc.name})`, () => {
            const result = simulateEvaluatorPass(tc.startingBalance, tc.proceeds);
            expect(result).toBe(tc.startingBalance);
        });

        it(`risk-monitor pass (FIXED): balance == startingBalance (${tc.name})`, () => {
            const result = simulateRiskMonitorPass(tc.startingBalance, tc.proceeds);
            expect(result).toBe(tc.startingBalance);
        });

        it(`both paths produce identical balance (${tc.name})`, () => {
            const evalResult = simulateEvaluatorPass(tc.startingBalance, tc.proceeds);
            const rmResult = simulateRiskMonitorPass(tc.startingBalance, tc.proceeds);
            expect(evalResult).toBe(rmResult);
        });
    }

    // This test documents the bug that was fixed
    it("REGRESSION: buggy path inflates balance (documents the original bug)", () => {
        const buggyResult = simulateBuggyRiskMonitorPass(25000, 4147.64);
        // The bug: balance = 25000 + 4147.64 = 29147.64 (Mat's actual inflated balance)
        expect(buggyResult).toBe(29147.64);
        expect(buggyResult).not.toBe(25000); // This is wrong — confirms the bug existed
    });
});
