/**
 * Property-Based Financial Math Tests
 *
 * Uses fast-check to generate random inputs and verify INVARIANTS
 * that must hold for ALL possible values — not just hand-picked examples.
 *
 * These catch the edge cases humans miss: floating point drift,
 * off-by-one at boundaries, sign flips, and overflow.
 *
 * NO MOCKS — all pure functions.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
    getDirectionAdjustedPrice,
    calculatePositionMetrics,
    getPortfolioValue,
} from "@/lib/position-utils";
import {
    invertOrderBook,
    calculateImpact,
    buildSyntheticOrderBook,
} from "@/lib/order-book-engine";
import { getExposureLimitByVolume, getFundedTier } from "@/lib/funded-rules";
import type { OrderBook } from "@/lib/market";

// ─── Custom Arbitraries ─────────────────────────────────────────────

/** Valid market price: 0 < p < 1 */
const validPrice = fc.double({ min: 0.01, max: 0.99, noNaN: true });

/** Valid share count: positive integer ≤ 100k */
const validShares = fc.integer({ min: 1, max: 100_000 });

/** Direction: YES or NO */
const direction = fc.constantFrom("YES" as const, "NO" as const);

/** Valid balance for tier/risk testing */
const validBalance = fc.constantFrom(5000, 10000, 25000);

// ─── getDirectionAdjustedPrice — Symmetry Properties ────────────────

describe("getDirectionAdjustedPrice — properties", () => {
    it("YES(p) + NO(p) = 1 for all valid prices", () => {
        fc.assert(
            fc.property(validPrice, (price) => {
                const yes = getDirectionAdjustedPrice(price, "YES");
                const no = getDirectionAdjustedPrice(price, "NO");
                expect(yes + no).toBeCloseTo(1, 10);
            })
        );
    });

    it("YES adjustment is identity: YES(p) = p", () => {
        fc.assert(
            fc.property(validPrice, (price) => {
                expect(getDirectionAdjustedPrice(price, "YES")).toBe(price);
            })
        );
    });

    it("NO adjustment is complement: NO(p) = 1 - p", () => {
        fc.assert(
            fc.property(validPrice, (price) => {
                expect(getDirectionAdjustedPrice(price, "NO")).toBeCloseTo(1 - price, 10);
            })
        );
    });

    it("double NO adjustment returns original: NO(NO(p)) = p", () => {
        fc.assert(
            fc.property(validPrice, (price) => {
                const flipped = getDirectionAdjustedPrice(price, "NO");
                const doubleFlipped = getDirectionAdjustedPrice(flipped, "NO");
                expect(doubleFlipped).toBeCloseTo(price, 10);
            })
        );
    });

    it("adjusted price is always in [0, 1] for valid inputs", () => {
        fc.assert(
            fc.property(validPrice, direction, (price, dir) => {
                const adjusted = getDirectionAdjustedPrice(price, dir);
                expect(adjusted).toBeGreaterThanOrEqual(0);
                expect(adjusted).toBeLessThanOrEqual(1);
            })
        );
    });
});

// ─── calculatePositionMetrics — Value Invariants ────────────────────

describe("calculatePositionMetrics — properties", () => {
    it("positionValue = shares × effectiveCurrentPrice", () => {
        fc.assert(
            fc.property(validShares, validPrice, validPrice, direction,
                (shares, entry, current, dir) => {
                    const result = calculatePositionMetrics(shares, entry, current, dir);
                    const expected = shares * result.effectiveCurrentPrice;
                    expect(result.positionValue).toBeCloseTo(expected, 6);
                }
            )
        );
    });

    it("PnL = (effectiveCurrentPrice - entryPrice) × shares", () => {
        fc.assert(
            fc.property(validShares, validPrice, validPrice, direction,
                (shares, entry, current, dir) => {
                    const result = calculatePositionMetrics(shares, entry, current, dir);
                    const expectedPnL = (result.effectiveCurrentPrice - entry) * shares;
                    expect(result.unrealizedPnL).toBeCloseTo(expectedPnL, 6);
                }
            )
        );
    });

    it("break-even when current = entry (YES): PnL is zero", () => {
        fc.assert(
            fc.property(validShares, validPrice, (shares, price) => {
                const result = calculatePositionMetrics(shares, price, price, "YES");
                expect(result.unrealizedPnL).toBeCloseTo(0, 10);
            })
        );
    });

    it("positionValue is never negative for valid inputs", () => {
        fc.assert(
            fc.property(validShares, validPrice, validPrice, direction,
                (shares, entry, current, dir) => {
                    const result = calculatePositionMetrics(shares, entry, current, dir);
                    expect(result.positionValue).toBeGreaterThanOrEqual(0);
                }
            )
        );
    });
});

// ─── invertOrderBook — Symmetry Properties ──────────────────────────

describe("invertOrderBook — properties", () => {
    const orderLevel = fc.record({
        price: validPrice.map(p => p.toFixed(2)),
        size: fc.integer({ min: 1, max: 10000 }).map(String),
    });

    const orderBook = fc.record({
        bids: fc.array(orderLevel, { minLength: 1, maxLength: 5 }),
        asks: fc.array(orderLevel, { minLength: 1, maxLength: 5 }),
    });

    it("inversion preserves total number of levels", () => {
        fc.assert(
            fc.property(orderBook, (book) => {
                const inverted = invertOrderBook(book);
                // NO bids → YES asks, NO asks → YES bids
                expect(inverted.asks.length).toBe(book.bids.length);
                expect(inverted.bids.length).toBe(book.asks.length);
            })
        );
    });

    it("inversion preserves sizes (only prices change)", () => {
        fc.assert(
            fc.property(orderBook, (book) => {
                const inverted = invertOrderBook(book);
                const originalSizes = [
                    ...book.bids.map(l => l.size),
                    ...book.asks.map(l => l.size),
                ].sort();
                const invertedSizes = [
                    ...inverted.asks.map(l => l.size), // bids→asks
                    ...inverted.bids.map(l => l.size), // asks→bids
                ].sort();
                expect(invertedSizes).toEqual(originalSizes);
            })
        );
    });

    it("all inverted prices are in valid range [0, 1]", () => {
        fc.assert(
            fc.property(orderBook, (book) => {
                const inverted = invertOrderBook(book);
                for (const level of [...inverted.bids, ...inverted.asks]) {
                    const p = parseFloat(level.price);
                    expect(p).toBeGreaterThanOrEqual(0);
                    expect(p).toBeLessThanOrEqual(1);
                }
            })
        );
    });

    it("double inversion returns approximately original prices", () => {
        fc.assert(
            fc.property(orderBook, (book) => {
                const doubleInverted = invertOrderBook(invertOrderBook(book));
                // After double inversion, all original bids should appear as bids
                // (though order may differ due to sorting)
                const origBidPrices = book.bids.map(l => parseFloat(l.price)).sort();
                const dblBidPrices = doubleInverted.bids.map(l => parseFloat(l.price)).sort();
                expect(origBidPrices.length).toBe(dblBidPrices.length);
                for (let i = 0; i < origBidPrices.length; i++) {
                    expect(dblBidPrices[i]).toBeCloseTo(origBidPrices[i], 1);
                }
            })
        );
    });
});

// ─── calculateImpact — Monotonicity ─────────────────────────────────

describe("calculateImpact — properties", () => {
    it("larger trades ≥ same shares as smaller trades (monotonicity)", () => {
        fc.assert(
            fc.property(validPrice, (price) => {
                const book = buildSyntheticOrderBook(price);
                const small = calculateImpact(book, "BUY", 10);
                const large = calculateImpact(book, "BUY", 100);

                if (small.filled && large.filled) {
                    expect(large.totalShares).toBeGreaterThanOrEqual(small.totalShares);
                }
            })
        );
    });

    it("slippage is non-negative for all filled trades", () => {
        fc.assert(
            fc.property(validPrice, fc.integer({ min: 1, max: 500 }), (price, amount) => {
                const book = buildSyntheticOrderBook(price);
                const result = calculateImpact(book, "BUY", amount);
                if (result.filled) {
                    expect(result.slippagePercent).toBeGreaterThanOrEqual(0);
                }
            })
        );
    });

    it("executedPrice is within book range for filled trades", () => {
        fc.assert(
            fc.property(validPrice, fc.integer({ min: 1, max: 100 }), (price, amount) => {
                const book = buildSyntheticOrderBook(price);
                const result = calculateImpact(book, "BUY", amount);
                if (result.filled) {
                    // Executed price should be ≥ best ask (lowest available)
                    const bestAsk = Math.min(...book.asks.map(a => parseFloat(a.price)));
                    expect(result.executedPrice).toBeGreaterThanOrEqual(bestAsk - 0.001);
                }
            })
        );
    });
});

// ─── getExposureLimitByVolume — Properties ──────────────────────────

describe("getExposureLimitByVolume — properties", () => {
    it("exposure limit is always ≤ 5% of balance", () => {
        fc.assert(
            fc.property(
                validBalance,
                fc.integer({ min: 0, max: 100_000_000 }),
                (balance, volume) => {
                    const limit = getExposureLimitByVolume(balance, volume);
                    expect(limit).toBeLessThanOrEqual(balance * 0.05);
                }
            )
        );
    });

    it("exposure limit is non-negative for non-negative inputs", () => {
        fc.assert(
            fc.property(
                validBalance,
                fc.integer({ min: 0, max: 100_000_000 }),
                (balance, volume) => {
                    expect(getExposureLimitByVolume(balance, volume)).toBeGreaterThanOrEqual(0);
                }
            )
        );
    });

    it("higher volume → greater or equal exposure limit (monotonic)", () => {
        fc.assert(
            fc.property(
                validBalance,
                fc.integer({ min: 0, max: 50_000_000 }),
                fc.integer({ min: 0, max: 50_000_000 }),
                (balance, vol1, vol2) => {
                    const [low, high] = vol1 < vol2 ? [vol1, vol2] : [vol2, vol1];
                    expect(getExposureLimitByVolume(balance, high))
                        .toBeGreaterThanOrEqual(getExposureLimitByVolume(balance, low));
                }
            )
        );
    });
});

// ─── getFundedTier — Properties ─────────────────────────────────────

describe("getFundedTier — properties", () => {
    it("always returns a valid tier for any positive balance", () => {
        fc.assert(
            fc.property(fc.integer({ min: 1, max: 1_000_000 }), (balance) => {
                const tier = getFundedTier(balance);
                expect(["5k", "10k", "25k"]).toContain(tier);
            })
        );
    });

    it("higher balance → greater or equal tier (monotonic)", () => {
        const tierOrder = { "5k": 0, "10k": 1, "25k": 2 } as const;
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 500_000 }),
                fc.integer({ min: 1, max: 500_000 }),
                (bal1, bal2) => {
                    const [low, high] = bal1 < bal2 ? [bal1, bal2] : [bal2, bal1];
                    const lowTier = tierOrder[getFundedTier(low)];
                    const highTier = tierOrder[getFundedTier(high)];
                    expect(highTier).toBeGreaterThanOrEqual(lowTier);
                }
            )
        );
    });
});

// ─── getPortfolioValue — Additive Property ──────────────────────────

describe("getPortfolioValue — properties", () => {
    it("total value = sum of individual position values", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.record({
                        shares: validShares.map(String),
                        entryPrice: validPrice.map(p => p.toFixed(2)),
                        livePrice: validPrice.map(p => p.toFixed(4)),
                    }),
                    { minLength: 1, maxLength: 5 }
                ),
                (posData) => {
                    const positions = posData.map((p, i) => ({
                        marketId: `m${i}`,
                        shares: p.shares,
                        entryPrice: p.entryPrice,
                        direction: "YES" as const,
                    }));
                    const prices = new Map(
                        posData.map((p, i) => [`m${i}`, { price: p.livePrice }])
                    );

                    const result = getPortfolioValue(positions, prices);
                    const sumOfParts = result.positions.reduce((s, p) => s + p.positionValue, 0);
                    expect(result.totalValue).toBeCloseTo(sumOfParts, 6);
                }
            )
        );
    });

    it("portfolio value is non-negative for valid positions", () => {
        fc.assert(
            fc.property(
                validShares, validPrice, validPrice,
                (shares, entry, live) => {
                    const result = getPortfolioValue(
                        [{ marketId: "m1", shares: String(shares), entryPrice: entry.toFixed(2) }],
                        new Map([["m1", { price: live.toFixed(4) }]])
                    );
                    expect(result.totalValue).toBeGreaterThanOrEqual(0);
                }
            )
        );
    });
});

// ─── buildSyntheticOrderBook — Structure Properties ─────────────────

describe("buildSyntheticOrderBook — properties", () => {
    it("always produces asks > bids for valid prices", () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.05, max: 0.95, noNaN: true }),
                (price) => {
                    const book = buildSyntheticOrderBook(price);
                    const bestBid = Math.max(...book.bids.map(b => parseFloat(b.price)));
                    const bestAsk = Math.min(...book.asks.map(a => parseFloat(a.price)));
                    expect(bestAsk).toBeGreaterThan(bestBid);
                }
            )
        );
    });

    it("mid-price is close to input price", () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0.05, max: 0.95, noNaN: true }),
                (price) => {
                    const book = buildSyntheticOrderBook(price);
                    const bestBid = Math.max(...book.bids.map(b => parseFloat(b.price)));
                    const bestAsk = Math.min(...book.asks.map(a => parseFloat(a.price)));
                    const mid = (bestBid + bestAsk) / 2;
                    // Mid-price should be within 1¢ of input price
                    expect(Math.abs(mid - price)).toBeLessThan(0.01);
                }
            )
        );
    });
});
