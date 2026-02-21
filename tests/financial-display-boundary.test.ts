/**
 * Financial Display Boundary Tests
 *
 * Tests the pure `getEquityStats` function against every boundary condition
 * that affects what a trader sees on their dashboard.
 *
 * ROOT CAUSE THIS PREVENTS:
 *   The "Phantom Daily PnL" class of bug — displaying misleading financial values
 *   by mixing cash-only and equity (cash + position value) semantics.
 *
 * DESIGN RULES:
 *   - No DB, no HTTP, no mocks — getEquityStats is a pure function.
 *   - One shared challenge fixture, mutated per scenario.
 *   - Test names read as a specification, not as code descriptions.
 *
 * See: docs/postmortems/2026-02-20-phantom-daily-pnl.md
 */

import { describe, it, expect } from "vitest";
import { getEquityStats, type DbChallengeRow } from "@/lib/dashboard-service";

// ───── Shared fixture ─────────────────────────────────────────────────────────
// $10K account, 8% max drawdown ($800), 10% profit target ($1,000), 4% daily DD ($400).
const BASE_CHALLENGE: DbChallengeRow = {
    id: "test-challenge-1",
    startedAt: new Date("2026-02-01"),
    endsAt: null,
    startingBalance: "10000",
    currentBalance: "10000",
    highWaterMark: "10000",
    startOfDayBalance: "10000",
    startOfDayEquity: "10000",
    phase: "challenge",
    status: "active",
    platform: "polymarket",
    rulesConfig: {
        maxDrawdown: 800,
        profitTarget: 1000,
        maxDailyDrawdownPercent: 0.04,
    },
};

function makeChallenge(overrides: Partial<DbChallengeRow>): DbChallengeRow {
    return { ...BASE_CHALLENGE, ...overrides };
}

const STARTING_BALANCE = 10_000;

// ───── Scenario 1: The Incident ────────────────────────────────────────────────
// Mat's exact account state before the fix: cash was $8,001, open positions
// worth $1,932 → true equity $9,933. But startOfDayEquity was NULL (column
// didn't exist yet). The bug showed dailyPnL = +$1,932 (position value).
// The correct behavior is: dailyPnL must be null (surface "— Today" in UI).
describe("Scenario 1: startOfDayEquity is null (pre-migration account)", () => {
    it("dailyPnL is null when startOfDayEquity is null", () => {
        const challenge = makeChallenge({
            currentBalance: "8001",
            startOfDayBalance: "9933",  // cash-only SOD (was the old column)
            startOfDayEquity: null,      // column didn't exist before migration
        });
        const equity = 9_933; // cash($8,001) + positions($1,932)

        const stats = getEquityStats(challenge, equity, STARTING_BALANCE);

        expect(stats.dailyPnL).toBeNull();
    });

    it("all other stats are still computed correctly when dailyPnL is null", () => {
        const challenge = makeChallenge({
            currentBalance: "8001",
            startOfDayBalance: "9933",
            startOfDayEquity: null,
        });
        const equity = 9_933;

        const stats = getEquityStats(challenge, equity, STARTING_BALANCE);

        // Total PnL from starting balance is still calculable
        expect(stats.totalPnL).toBeCloseTo(-67, 1);
        // Drawdown: HWM($10,000) - equity($9,933) = $67
        expect(stats.drawdownAmount).toBeCloseTo(67, 1);
        // profitProgress on negative PnL must be clamped to 0
        expect(stats.profitProgress).toBe(0);
    });
});

// ───── Scenario 2: After Cron Runs ─────────────────────────────────────────────
// Same account after midnight cron snapshots true equity into startOfDayEquity.
// Now dailyPnL should reflect the REAL change: equity($9,933) - SOD_equity($10,000) = -$67.
describe("Scenario 2: startOfDayEquity is populated (after midnight cron)", () => {
    it("dailyPnL reflects equity-vs-equity change, not cash-vs-cash", () => {
        const challenge = makeChallenge({
            currentBalance: "8001",
            startOfDayBalance: "10000",
            startOfDayEquity: "10000", // cron ran, captured true equity at midnight
        });
        const equity = 9_933;

        const stats = getEquityStats(challenge, equity, STARTING_BALANCE);

        expect(stats.dailyPnL).toBeCloseTo(-67, 1);
    });

    it("dailyPnL is NOT equal to open position value (that was the phantom)", () => {
        const openPositionValue = 1_932;
        const challenge = makeChallenge({
            currentBalance: "8001",
            startOfDayBalance: "10000",
            startOfDayEquity: "10000",
        });
        const equity = 9_933;

        const stats = getEquityStats(challenge, equity, STARTING_BALANCE);

        expect(stats.dailyPnL).not.toBeCloseTo(openPositionValue, 0);
    });
});

// ───── Scenario 3: Flat Day, No Positions ──────────────────────────────────────
describe("Scenario 3: Flat day — equity unchanged from start of day", () => {
    it("dailyPnL is exactly $0", () => {
        const challenge = makeChallenge({
            currentBalance: "10000",
            startOfDayBalance: "10000",
            startOfDayEquity: "10000",
        });

        const stats = getEquityStats(challenge, 10_000, STARTING_BALANCE);

        expect(stats.dailyPnL).toBe(0);
    });

    it("drawdownUsage is 0 when equity equals HWM", () => {
        const challenge = makeChallenge({
            highWaterMark: "10000",
        });

        const stats = getEquityStats(challenge, 10_000, STARTING_BALANCE);

        expect(stats.drawdownUsage).toBe(0);
        expect(stats.drawdownAmount).toBe(0);
    });
});

// ───── Scenario 4: Profitable Day ──────────────────────────────────────────────
describe("Scenario 4: Profitable day — equity up from start of day", () => {
    it("dailyPnL is positive and equals equity gain since midnight", () => {
        const challenge = makeChallenge({
            currentBalance: "10500",
            startOfDayBalance: "10000",
            startOfDayEquity: "10000",
            highWaterMark: "10500",
        });

        const stats = getEquityStats(challenge, 10_500, STARTING_BALANCE);

        expect(stats.dailyPnL).toBeCloseTo(500, 1);
    });

    it("totalPnL is positive when equity exceeds starting balance", () => {
        const challenge = makeChallenge({
            currentBalance: "10500",
            startOfDayBalance: "10000",
            startOfDayEquity: "10000",
            highWaterMark: "10500",
        });

        const stats = getEquityStats(challenge, 10_500, STARTING_BALANCE);

        expect(stats.totalPnL).toBeCloseTo(500, 1);
    });
});

// ───── Scenario 5: Max Drawdown 50% Used ───────────────────────────────────────
// HWM = $10,500, max drawdown = $800. Current equity = $10,100 → drawdown = $400 → 50%.
describe("Scenario 5: Max drawdown halfway consumed", () => {
    it("drawdownUsage is 50% when drawdown is half the limit", () => {
        const challenge = makeChallenge({
            highWaterMark: "10500",
            currentBalance: "10100",
            startOfDayEquity: "10400",
        });
        const equity = 10_100; // HWM($10,500) - equity($10,100) = $400 drawdown

        const stats = getEquityStats(challenge, equity, STARTING_BALANCE);

        // maxDrawdownLimit = 800 (from rulesConfig), drawdownAmount = 400
        expect(stats.drawdownAmount).toBeCloseTo(400, 1);
        expect(stats.drawdownUsage).toBeCloseTo(50, 1);
    });
});

// ───── Scenario 6: Daily Drawdown at 100% ──────────────────────────────────────
// SOD_balance = $10,000, daily limit = 4% × $10,000 = $400. Equity = $9,600 → 100%.
describe("Scenario 6: Daily drawdown limit fully consumed", () => {
    it("dailyDrawdownUsage is 100% when equity has dropped by the full daily limit", () => {
        const challenge = makeChallenge({
            currentBalance: "9600",
            startOfDayBalance: "10000",
            startOfDayEquity: "10000",
        });
        const equity = 9_600;

        const stats = getEquityStats(challenge, equity, STARTING_BALANCE);

        // daily limit = 4% × $10,000 = $400. Loss = $400. Usage = 100%.
        expect(stats.dailyDrawdownAmount).toBeCloseTo(400, 1);
        expect(stats.dailyDrawdownUsage).toBeCloseTo(100, 1);
    });

    it("dailyDrawdownUsage exceeds 100% when equity drops below the daily floor", () => {
        const challenge = makeChallenge({
            currentBalance: "9500",
            startOfDayBalance: "10000",
            startOfDayEquity: "10000",
        });
        const equity = 9_500; // $500 loss vs $400 limit → 125%

        const stats = getEquityStats(challenge, equity, STARTING_BALANCE);

        expect(stats.dailyDrawdownUsage).toBeGreaterThan(100);
    });
});

// ───── Scenario 7: Profit Progress Clamping ────────────────────────────────────
// profitProgress must always be in [0, 100] regardless of input.
// Over-target (e.g. 105% of way to goal) → 100. Negative PnL → 0.
describe("Scenario 7: profitProgress is always clamped to [0, 100]", () => {
    it("profitProgress is 0 when totalPnL is negative (losing money)", () => {
        const challenge = makeChallenge({
            currentBalance: "9000",
            startOfDayEquity: "9500",
        });
        const equity = 9_000; // -$1,000 from starting balance

        const stats = getEquityStats(challenge, equity, STARTING_BALANCE);

        expect(stats.profitProgress).toBe(0);
    });

    it("profitProgress is 100 when profit exceeds the target (not >100)", () => {
        const challenge = makeChallenge({
            currentBalance: "11200",
            highWaterMark: "11200",
            startOfDayEquity: "11000",
        });
        const equity = 11_200; // $1,200 profit vs $1,000 target → would be 120% raw

        const stats = getEquityStats(challenge, equity, STARTING_BALANCE);

        expect(stats.profitProgress).toBe(100);
    });

    it("profitProgress is proportional between 0 and target", () => {
        const challenge = makeChallenge({
            currentBalance: "10500",
            highWaterMark: "10500",
            startOfDayEquity: "10000",
        });
        const equity = 10_500; // $500 of $1,000 target = 50%

        const stats = getEquityStats(challenge, equity, STARTING_BALANCE);

        expect(stats.profitProgress).toBeCloseTo(50, 1);
    });
});
