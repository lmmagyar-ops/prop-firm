/**
 * Deterministic test for the Ending Soon 30-day cutoff filter.
 * Tests the exact isEndingSoon logic from MarketGridWithTabs.tsx.
 *
 * Run: npx vitest run tests/ending-soon-filter.test.ts
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

// ─── Replicate the exact production logic ───────────────────────────
const ENDING_SOON_WINDOW_DAYS = 30;

interface MinimalEvent {
    endDate?: string;
}

function isEndingSoon(event: MinimalEvent): boolean {
    if (!event.endDate) return false;
    const endMs = new Date(event.endDate).getTime();
    const cutoffMs = Date.now() + ENDING_SOON_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return endMs > Date.now() && endMs <= cutoffMs;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('Ending Soon — 30-day cutoff filter', () => {
    // Pin "now" to March 1, 2026 10:00 UTC for deterministic results
    const NOW = new Date('2026-03-01T10:00:00Z').getTime();

    afterEach(() => {
        vi.restoreAllMocks();
    });

    function withFrozenTime(fn: () => void) {
        vi.spyOn(Date, 'now').mockReturnValue(NOW);
        fn();
    }

    it('includes market ending in 7 days (Mar 8)', () => {
        withFrozenTime(() => {
            expect(isEndingSoon({ endDate: '2026-03-08T00:00:00Z' })).toBe(true);
        });
    });

    it('includes market ending in 29 days (Mar 30)', () => {
        withFrozenTime(() => {
            expect(isEndingSoon({ endDate: '2026-03-30T00:00:00Z' })).toBe(true);
        });
    });

    it('includes market ending in exactly 30 days (Mar 31 10:00 UTC)', () => {
        withFrozenTime(() => {
            // Exactly at cutoff — should be included (<=)
            expect(isEndingSoon({ endDate: '2026-03-31T10:00:00Z' })).toBe(true);
        });
    });

    it('EXCLUDES market ending in 31 days (Apr 1)', () => {
        withFrozenTime(() => {
            expect(isEndingSoon({ endDate: '2026-04-01T00:00:00Z' })).toBe(false);
        });
    });

    it('EXCLUDES market ending in 10 months — Greenland (Dec 31, 2026)', () => {
        withFrozenTime(() => {
            expect(isEndingSoon({ endDate: '2026-12-31T00:00:00Z' })).toBe(false);
        });
    });

    it('EXCLUDES market ending in 4 months — NBA Champion (Jul 2026)', () => {
        withFrozenTime(() => {
            expect(isEndingSoon({ endDate: '2026-07-01T00:00:00Z' })).toBe(false);
        });
    });

    it('EXCLUDES market that already ended (past date)', () => {
        withFrozenTime(() => {
            expect(isEndingSoon({ endDate: '2026-02-28T00:00:00Z' })).toBe(false);
        });
    });

    it('EXCLUDES event with no endDate', () => {
        withFrozenTime(() => {
            expect(isEndingSoon({})).toBe(false);
            expect(isEndingSoon({ endDate: undefined })).toBe(false);
        });
    });

    it('includes market ending in 1 hour', () => {
        withFrozenTime(() => {
            const oneHourFromNow = new Date(NOW + 60 * 60 * 1000).toISOString();
            expect(isEndingSoon({ endDate: oneHourFromNow })).toBe(true);
        });
    });

    it('EXCLUDES market ending exactly now (boundary: endMs === Date.now())', () => {
        withFrozenTime(() => {
            // endMs > Date.now() is false when equal, so excluded
            const exactlyNow = new Date(NOW).toISOString();
            expect(isEndingSoon({ endDate: exactlyNow })).toBe(false);
        });
    });
});
