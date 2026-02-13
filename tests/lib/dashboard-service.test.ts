import { describe, it, expect, vi } from "vitest";
import {
    mapChallengeHistory,
    getPositionsWithPnL,
    getEquityStats,
    getFundedStats,
    computeBestMarketCategory,
} from "@/lib/dashboard-service";

// ─── mapChallengeHistory ────────────────────────────────────────────

describe("mapChallengeHistory", () => {
    function mkChallenge(overrides: Record<string, unknown> = {}) {
        return {
            id: "ch-1",
            startingBalance: "10000",
            currentBalance: "10500",
            status: "active",
            phase: "challenge",
            platform: "polymarket",
            startedAt: new Date("2026-01-15"),
            endsAt: new Date("2026-02-15"),
            ...overrides,
        } as any;
    }

    it("maps a single active challenge correctly", () => {
        const result = mapChallengeHistory([mkChallenge()]);

        expect(result).toHaveLength(1);
        expect(result[0].accountNumber).toBe("CH-2026-001");
        expect(result[0].challengeType).toBe("$10,000 Challenge");
        expect(result[0].status).toBe("active");
        expect(result[0].finalPnL).toBeNull(); // active = no final P&L
    });

    it("calculates finalPnL for completed challenges", () => {
        const result = mapChallengeHistory([
            mkChallenge({ status: "passed", currentBalance: "11000" }),
        ]);
        expect(result[0].finalPnL).toBe(1000); // 11000 - 10000
    });

    it("calculates negative finalPnL for failed challenges", () => {
        const result = mapChallengeHistory([
            mkChallenge({ status: "failed", currentBalance: "9200" }),
        ]);
        expect(result[0].finalPnL).toBe(-800);
    });

    it("sorts challenges by startedAt descending (newest first)", () => {
        const result = mapChallengeHistory([
            mkChallenge({ id: "old", startedAt: new Date("2025-01-01") }),
            mkChallenge({ id: "new", startedAt: new Date("2026-06-01") }),
            mkChallenge({ id: "mid", startedAt: new Date("2025-06-01") }),
        ]);

        expect(result[0].id).toBe("new");
        expect(result[1].id).toBe("mid");
        expect(result[2].id).toBe("old");
    });

    it("handles challenges with no startedAt (uses 'XXXX' in account number)", () => {
        const result = mapChallengeHistory([
            mkChallenge({ startedAt: null }),
        ]);
        expect(result[0].accountNumber).toBe("CH-XXXX-001");
    });

    it("defaults platform to 'polymarket' when missing", () => {
        const result = mapChallengeHistory([
            mkChallenge({ platform: null }),
        ]);
        expect(result[0].platform).toBe("polymarket");
    });

    it("returns empty array for no challenges", () => {
        expect(mapChallengeHistory([])).toEqual([]);
    });
});

// ─── getPositionsWithPnL ────────────────────────────────────────────

describe("getPositionsWithPnL", () => {
    function mkDbPos(overrides: Record<string, unknown> = {}) {
        return {
            id: "pos-1",
            marketId: "market-1",
            shares: "10",
            entryPrice: "0.40",
            currentPrice: null,
            direction: "YES",
            sizeAmount: "5.00",
            status: "OPEN",
            openedAt: new Date("2026-02-01"),
            ...overrides,
        } as any;
    }

    function mkPrices(entries: Record<string, string>): Map<string, { price: string; source?: string }> {
        const map = new Map<string, { price: string; source?: string }>();
        for (const [id, price] of Object.entries(entries)) {
            map.set(id, { price, source: "gamma" });
        }
        return map;
    }

    function mkTitles(entries: Record<string, string>): Map<string, string> {
        return new Map(Object.entries(entries));
    }

    it("enriches positions with live prices and market titles", () => {
        const result = getPositionsWithPnL(
            [mkDbPos()],
            mkPrices({ "market-1": "0.60" }),
            mkTitles({ "market-1": "Will it rain?" })
        );

        expect(result).toHaveLength(1);
        expect(result[0].marketTitle).toBe("Will it rain?");
        expect(result[0].currentPrice).toBe(0.60);
        expect(result[0].unrealizedPnL).toBeCloseTo(2.0); // (0.60 - 0.40) * 10
        expect(result[0].priceSource).toBe("gamma");
    });

    it("uses truncated market ID as fallback title", () => {
        const result = getPositionsWithPnL(
            [mkDbPos({ marketId: "abcdef1234567890" })],
            mkPrices({ abcdef1234567890: "0.50" }),
            new Map() // no titles
        );

        expect(result[0].marketTitle).toBe("Market abcdef12...");
    });

    it("returns empty array for no positions", () => {
        const result = getPositionsWithPnL([], new Map(), new Map());
        expect(result).toEqual([]);
    });

    it("handles multiple positions and sums correctly", () => {
        const result = getPositionsWithPnL(
            [
                mkDbPos({ id: "p1", marketId: "m1", shares: "10", entryPrice: "0.40" }),
                mkDbPos({ id: "p2", marketId: "m2", shares: "20", entryPrice: "0.30" }),
            ],
            mkPrices({ m1: "0.50", m2: "0.40" }),
            mkTitles({ m1: "Market A", m2: "Market B" })
        );

        expect(result).toHaveLength(2);
        // p1: (0.50 - 0.40) * 10 = 1.0
        expect(result[0].unrealizedPnL).toBeCloseTo(1.0);
        // p2: (0.40 - 0.30) * 20 = 2.0
        expect(result[1].unrealizedPnL).toBeCloseTo(2.0);
    });

    it("includes all required fields for UI consumption", () => {
        const result = getPositionsWithPnL(
            [mkDbPos()],
            mkPrices({ "market-1": "0.60" }),
            mkTitles({ "market-1": "Test" })
        );

        const pos = result[0];
        expect(pos).toHaveProperty("id");
        expect(pos).toHaveProperty("marketId");
        expect(pos).toHaveProperty("marketTitle");
        expect(pos).toHaveProperty("direction");
        expect(pos).toHaveProperty("sizeAmount");
        expect(pos).toHaveProperty("shares");
        expect(pos).toHaveProperty("entryPrice");
        expect(pos).toHaveProperty("currentPrice");
        expect(pos).toHaveProperty("unrealizedPnL");
        expect(pos).toHaveProperty("positionValue");
        expect(pos).toHaveProperty("openedAt");
        expect(pos).toHaveProperty("priceSource");
    });
});

// ─── getEquityStats ─────────────────────────────────────────────────

describe("getEquityStats", () => {
    function mkChallenge(overrides: Record<string, unknown> = {}) {
        return {
            highWaterMark: "10500",
            startOfDayBalance: "10200",
            rulesConfig: {
                maxDrawdown: 1000,
                maxDailyDrawdownPercent: 0.05,
                profitTarget: 1000,
            },
            ...overrides,
        } as any;
    }

    it("calculates P&L correctly when in profit", () => {
        const stats = getEquityStats(mkChallenge(), 10800, 10000);
        expect(stats.totalPnL).toBe(800);    // 10800 - 10000
        expect(stats.dailyPnL).toBe(600);    // 10800 - 10200
    });

    it("calculates P&L correctly when in loss", () => {
        const stats = getEquityStats(mkChallenge(), 9500, 10000);
        expect(stats.totalPnL).toBe(-500);
        expect(stats.dailyPnL).toBe(-700);   // 9500 - 10200
    });

    it("calculates drawdown usage percentage", () => {
        // HWM = 10500, equity = 10000, drawdown = 500
        // maxDrawdown = 1000, so usage = 50%
        const stats = getEquityStats(mkChallenge(), 10000, 10000);
        expect(stats.drawdownUsage).toBe(50);
    });

    it("calculates daily drawdown usage percentage", () => {
        // SOD = 10200, equity = 9700, daily drawdown = 500
        // maxDailyDrawdown = 0.05 * 10000 = 500, so usage = 100%
        const stats = getEquityStats(mkChallenge(), 9700, 10000);
        expect(stats.dailyDrawdownUsage).toBe(100);
    });

    it("clamps drawdown at zero (no negative drawdown)", () => {
        // Equity above HWM → drawdown amount = max(0, 10500 - 11000) = 0
        const stats = getEquityStats(mkChallenge(), 11000, 10000);
        expect(stats.drawdownUsage).toBe(0);
    });

    it("calculates profit progress correctly", () => {
        // totalPnL = 800, profitTarget = 1000, progress = 80%
        const stats = getEquityStats(mkChallenge(), 10800, 10000);
        expect(stats.profitProgress).toBe(80);
    });

    it("clamps profit progress between 0 and 100", () => {
        // Negative P&L → 0%
        const negStats = getEquityStats(mkChallenge(), 9500, 10000);
        expect(negStats.profitProgress).toBe(0);

        // P&L exceeds target → 100%
        const overStats = getEquityStats(mkChallenge(), 11500, 10000);
        expect(overStats.profitProgress).toBe(100);
    });

    it("uses defaults when rulesConfig is null", () => {
        const stats = getEquityStats(
            mkChallenge({ rulesConfig: null }),
            10000,
            10000
        );
        // Should not throw — uses DEFAULT_MAX_DRAWDOWN and defaults
        expect(stats.totalPnL).toBe(0);
        expect(stats.profitProgress).toBe(0);
    });

    it("falls back to startingBalance for HWM and SOD when invalid", () => {
        const stats = getEquityStats(
            mkChallenge({ highWaterMark: "0", startOfDayBalance: "0" }),
            10500,
            10000
        );
        // HWM falls back to startingBalance (10000)
        // drawdown = max(0, 10000 - 10500) = 0
        expect(stats.drawdownUsage).toBe(0);
    });
});

// ─── getFundedStats ─────────────────────────────────────────────────

describe("getFundedStats", () => {
    function mkFundedChallenge(overrides: Record<string, unknown> = {}) {
        return {
            phase: "funded",
            profitSplit: "0.80",
            payoutCap: "10000",
            activeTradingDays: 7,
            consistencyFlagged: false,
            lastActivityAt: new Date(),
            payoutCycleStart: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            ...overrides,
        } as any;
    }

    it("selects correct tier based on starting balance", () => {
        expect(getFundedStats(mkFundedChallenge(), 5000, 5000).tier).toBe("5k");
        expect(getFundedStats(mkFundedChallenge(), 10000, 10000).tier).toBe("10k");
        expect(getFundedStats(mkFundedChallenge(), 25000, 25000).tier).toBe("25k");
    });

    it("calculates payout eligibility when in profit with enough days", () => {
        const stats = getFundedStats(
            mkFundedChallenge({ activeTradingDays: 7 }),
            11000,  // equity
            10000   // starting = $10k tier, minTradingDays = 5
        );

        expect(stats.netProfit).toBe(1000);
        expect(stats.eligible).toBe(true);
        expect(stats.activeTradingDays).toBe(7);
        expect(stats.requiredTradingDays).toBe(5);
    });

    it("marks ineligible when not enough trading days", () => {
        const stats = getFundedStats(
            mkFundedChallenge({ activeTradingDays: 3 }),
            11000,
            10000
        );

        expect(stats.eligible).toBe(false);
        expect(stats.activeTradingDays).toBe(3);
        expect(stats.requiredTradingDays).toBe(5);
    });

    it("marks ineligible when in loss (even with enough days)", () => {
        const stats = getFundedStats(
            mkFundedChallenge({ activeTradingDays: 10 }),
            9500,   // in loss
            10000
        );

        expect(stats.netProfit).toBe(-500);
        expect(stats.eligible).toBe(false);
    });

    it("calculates days until payout correctly", () => {
        // payoutCycleStart = 5 days ago, cycle = 14 days → 9 days left
        const stats = getFundedStats(mkFundedChallenge(), 10000, 10000);
        expect(stats.daysUntilPayout).toBe(9);
    });

    it("handles missing payoutCycleStart (defaults to 0 days passed)", () => {
        const stats = getFundedStats(
            mkFundedChallenge({ payoutCycleStart: null }),
            10000,
            10000
        );
        expect(stats.daysUntilPayout).toBe(14); // full cycle remaining
    });

    it("returns correct profit split and payout cap", () => {
        const stats = getFundedStats(mkFundedChallenge(), 10000, 10000);
        expect(stats.profitSplit).toBe(0.80);
        expect(stats.payoutCap).toBe(10000);
    });

    it("uses funded rules defaults when challenge fields are missing", () => {
        const stats = getFundedStats(
            mkFundedChallenge({ profitSplit: null, payoutCap: null }),
            10000,
            10000
        );
        // Should fall back to FUNDED_RULES["10k"] defaults
        expect(stats.profitSplit).toBe(0.80);
        expect(stats.payoutCap).toBe(10000);
    });
});

// ─── computeBestMarketCategory ──────────────────────────────────────

describe("computeBestMarketCategory", () => {
    function mkTrade(marketId: string, pnl: string | null) {
        return { marketId, realizedPnL: pnl };
    }

    function mkTitles(entries: Record<string, string>): Map<string, string> {
        return new Map(Object.entries(entries));
    }

    it("returns null for empty trade list", () => {
        expect(computeBestMarketCategory([], new Map())).toBeNull();
    });

    it("classifies unrecognized titles as 'Other'", () => {
        // Titles that don't match any keyword get classified as "Other"
        const trades = [
            mkTrade("m1", "10"),
            mkTrade("m1", "5"),
        ];
        const titles = mkTitles({ m1: "Zxqwv blah nonsense" });
        expect(computeBestMarketCategory(trades, titles)).toBe("Other");
    });

    it("returns null when market title is not found", () => {
        const trades = [mkTrade("m1", "10"), mkTrade("m1", "-5")];
        // Empty titles map — no title for m1
        expect(computeBestMarketCategory(trades, new Map())).toBeNull();
    });

    it("picks the category with highest win rate (min 2 trades)", () => {
        const trades = [
            // Politics: 2 wins, 1 loss → 66.7%
            mkTrade("m1", "50"),
            mkTrade("m1", "30"),
            mkTrade("m1", "-20"),
            // Crypto: 2 wins, 0 losses → 100%
            mkTrade("m2", "100"),
            mkTrade("m2", "40"),
        ];
        const titles = mkTitles({
            m1: "Will Biden win the election?",
            m2: "Will Bitcoin reach $100k?",
        });

        expect(computeBestMarketCategory(trades, titles)).toBe("Crypto");
    });

    it("requires minimum 2 trades for a category to qualify", () => {
        const trades = [
            // Crypto: 1 winning trade (below threshold)
            mkTrade("m1", "100"),
            // Politics: 2 trades, both winning
            mkTrade("m2", "50"),
            mkTrade("m2", "30"),
        ];
        const titles = mkTitles({
            m1: "Will Bitcoin reach $100k?",
            m2: "Will Trump win the election?",
        });

        // Crypto has 100% win rate but only 1 trade — should pick Politics
        expect(computeBestMarketCategory(trades, titles)).toBe("Politics");
    });

    it("breaks ties by total trade count", () => {
        const trades = [
            // Politics: 2 wins out of 2 → 100%
            mkTrade("m1", "50"),
            mkTrade("m1", "30"),
            // Sports: 3 wins out of 3 → 100%
            mkTrade("m2", "10"),
            mkTrade("m2", "20"),
            mkTrade("m2", "30"),
        ];
        const titles = mkTitles({
            m1: "Will the president sign the bill?",
            m2: "Lakers vs Celtics NBA finals",
        });

        // Same win rate, but Sports has more trades → Sports wins
        expect(computeBestMarketCategory(trades, titles)).toBe("Sports");
    });

    it("treats negative or zero PnL as a loss", () => {
        const trades = [
            mkTrade("m1", "0"),     // zero = loss
            mkTrade("m1", "-5"),    // negative = loss
            mkTrade("m1", "10"),    // positive = win
        ];
        const titles = mkTitles({ m1: "Will Bitcoin reach $200k?" });

        // 1 win, 2 losses → 33.3% but still the only category ≥2 trades
        const result = computeBestMarketCategory(trades, titles);
        expect(result).toBe("Crypto");
    });
});
