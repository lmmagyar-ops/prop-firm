import { describe, it, expect } from "vitest";
import { isStaleMarketQuestion } from "@/lib/market-utils";

// ─── Test Clock ───────────────────────────────────────────────────────────────
// Pin "now" to Feb 22, 2026 at 10:00 AM CT (16:00 UTC) for all tests.
// This matches the real-world scenario where the bug was discovered.
const FEB_22_10AM_CT = new Date("2026-02-22T16:00:00.000Z");

// ─── Helpers ──────────────────────────────────────────────────────────────────
const stale = (q: string) => isStaleMarketQuestion(q, FEB_22_10AM_CT);

// =============================================================================
// isStaleMarketQuestion — Single Date Patterns
// =============================================================================
describe("isStaleMarketQuestion — single date", () => {
    it("returns false for today's date (Feb 22) — must NOT be filtered", () => {
        expect(stale("Will Bitcoin be above $68,000 on February 22?")).toBe(false);
        expect(stale("Will the price of Bitcoin be above $60,000 on February 22?")).toBe(false);
    });

    it("returns false for tomorrow (Feb 23) — future markets unaffected", () => {
        expect(stale("Will Bitcoin be above $80,000 on February 23?")).toBe(false);
    });

    it("returns false for yesterday (Feb 21) — within 48h grace window", () => {
        expect(stale("Will Bitcoin close above $65,000 on February 21?")).toBe(false);
    });

    it("returns true for Feb 19 — more than 48h ago at 10am Feb 22", () => {
        // Feb 19 midnight local < Feb 20 10am (twoDaysAgo)
        expect(stale("Will Bitcoin be above $70,000 on February 19?")).toBe(true);
    });

    it("returns true for Feb 20 — exactly 2 days ago", () => {
        // Feb 20 midnight local < Feb 20 10am UTC-ish
        expect(stale("Some question on February 20?")).toBe(true);
    });

    it("returns false for March (future month)", () => {
        expect(stale("Will something happen on March 5?")).toBe(false);
    });

    it("returns false for January (this year, but >48h ago)", () => {
        // January 12 is well past — should be filtered
        expect(stale("Will X happen on January 12?")).toBe(true);
    });

    it("returns false when no date appears in question", () => {
        expect(stale("Will Bitcoin exceed $100,000?")).toBe(false);
        expect(stale("Who will win the 2028 election?")).toBe(false);
    });

    it("handles inline date without question mark (not at end)", () => {
        // "on February 22 at 5 PM" — the date is followed by a space
        expect(stale("Will Bitcoin close above $68,000 on February 22 at 5 PM ET?")).toBe(false);
    });
});

// =============================================================================
// isStaleMarketQuestion — Date Range Patterns
// =============================================================================
describe("isStaleMarketQuestion — date range", () => {
    it("returns false for a range ending today (Feb 22)", () => {
        expect(stale("Will it happen during February 20-22?")).toBe(false);
    });

    it("returns false for a range ending yesterday (Feb 21) — within grace", () => {
        expect(stale("Will it happen during February 20-21?")).toBe(false);
    });

    it("returns true for a range ending Feb 19 — 3 days ago", () => {
        // Uses END of range: day 19 < Feb 20 10am (twoDaysAgo)
        expect(stale("February 17-19 question?")).toBe(true);
    });

    it("returns false for a range ending in the future", () => {
        expect(stale("February 22-28 week options")).toBe(false);
    });
});

// =============================================================================
// isStaleMarketQuestion — Edge Cases
// =============================================================================
describe("isStaleMarketQuestion — edge cases", () => {
    it("is case-insensitive for month names", () => {
        expect(stale("will bitcoin close above $68k on FEBRUARY 22?")).toBe(false);
        expect(stale("JANUARY 15 question")).toBe(true);
    });

    it("does not false-positive on year numbers", () => {
        // "2026" is not a day number after a month, so should not trigger
        expect(stale("2026 presidential election")).toBe(false);
    });

    it("handles question with no dates gracefully", () => {
        expect(stale("")).toBe(false);
        expect(stale("Yes")).toBe(false);
    });

    it("does not count range pattern twice as single", () => {
        // "February 20-22" should be treated as a RANGE (end=22), not single (Feb 20)
        // Since rangeMatch prevents singleMatch from also firing, behavior is:
        // end day = 22 = today → NOT stale
        expect(stale("February 20-22 market")).toBe(false);
    });
});

// =============================================================================
// Regression: the original bug
// =============================================================================
describe("Regression: Feb 22 Bitcoin event — the original bug", () => {
    // On Feb 22 at 10am CT, ALL of these were incorrectly filtered by the
    // original 24h-grace-window code due to midnight-UTC parsing.
    const BITCOIN_FEB22_QUESTIONS = [
        "Will the price of Bitcoin be above $60,000 on February 22?",
        "Will the price of Bitcoin be above $62,000 on February 22?",
        "Will the price of Bitcoin be above $64,000 on February 22?",
        "Will the price of Bitcoin be above $66,000 on February 22?",
        "Will the price of Bitcoin be above $68,000 on February 22?",
        "Will the price of Bitcoin be above $70,000 on February 22?",
        "Will the price of Bitcoin be above $72,000 on February 22?",
        "Will the price of Bitcoin be above $74,000 on February 22?",
        "Will the price of Bitcoin be above $76,000 on February 22?",
        "Will the price of Bitcoin be above $78,000 on February 22?",
        "Will the price of Bitcoin be above $80,000 on February 22?",
    ];

    it("keeps all 11 Bitcoin Feb 22 thresholds at 10am CT on Feb 22", () => {
        for (const question of BITCOIN_FEB22_QUESTIONS) {
            expect(stale(question)).toBe(false);
        }
    });
});
