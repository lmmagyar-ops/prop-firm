/**
 * Order Book Engine — Pure computation functions for order book operations.
 *
 * Extracted from MarketService to enable direct unit testing without Redis.
 * All functions here are stateless and side-effect-free.
 */

import type { OrderBook, ExecutionSimulation } from "./market";

// ─── Dead Book Detection ────────────────────────────────────────────

/**
 * Detect a "dead" order book — one with no meaningful liquidity.
 * A dead book has an enormous spread (>50¢) or asks starting at ≥90¢.
 */
export function isBookDead(book: OrderBook): boolean {
    const asks = book.asks || [];
    const bids = book.bids || [];

    if (asks.length === 0 || bids.length === 0) return true;

    const bestAsk = parseFloat(asks[0].price);
    const bestBid = parseFloat(bids[0].price);
    const spread = bestAsk - bestBid;

    // Dead if spread > 50¢ or best ask is in resolution territory
    return spread > 0.50 || bestAsk >= 0.90;
}

// ─── Order Book Inversion ───────────────────────────────────────────

/**
 * Invert a NO token's order book to create a YES-equivalent book.
 *
 * Math: In prediction markets, YES + NO = $1.00
 * - NO bids at price X → YES asks at price (1-X) [sorted ascending]
 * - NO asks at price X → YES bids at price (1-X) [sorted descending]
 */
export function invertOrderBook(noBook: OrderBook): OrderBook {
    const noBids = noBook.bids || [];
    const noAsks = noBook.asks || [];

    // NO bids → YES asks (inverted prices, sorted ascending by price)
    const yesAsks = noBids
        .map(level => ({
            price: (1 - parseFloat(level.price)).toFixed(2),
            size: level.size,
        }))
        .sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

    // NO asks → YES bids (inverted prices, sorted descending by price)
    const yesBids = noAsks
        .map(level => ({
            price: (1 - parseFloat(level.price)).toFixed(2),
            size: level.size,
        }))
        .sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

    return { bids: yesBids, asks: yesAsks };
}

// ─── Synthetic Order Book ───────────────────────────────────────────

/**
 * Build a synthetic order book from a known price.
 * Simulates REALISTIC liquidity around the current price.
 *
 * PARITY FIX (Jan 2026): Reduced from 50K to 5K shares per level
 * and widened spread from 1¢ to 2¢ to match typical Polymarket depth.
 */
export function buildSyntheticOrderBook(price: number): OrderBook {
    // PARITY: Real Polymarket spreads are 0.5%-10%, we use 2¢
    const spread = 0.02; // 2 cent spread (was 1¢)
    // PARITY: Real Polymarket depth is ~1K-10K per level
    const depthPerLevel = "5000"; // (was 50000)

    return {
        bids: [
            { price: Math.max(0.01, price - spread).toFixed(2), size: depthPerLevel },
            { price: Math.max(0.01, price - spread * 2).toFixed(2), size: depthPerLevel },
            { price: Math.max(0.01, price - spread * 3).toFixed(2), size: depthPerLevel }
        ],
        asks: [
            { price: Math.min(0.99, price + spread).toFixed(2), size: depthPerLevel },
            { price: Math.min(0.99, price + spread * 2).toFixed(2), size: depthPerLevel },
            { price: Math.min(0.99, price + spread * 3).toFixed(2), size: depthPerLevel }
        ]
    };
}

// ─── Trade Impact Simulation ────────────────────────────────────────

/**
 * Calculates the "Weighted Average Price" for a trade size.
 * Walks the book to simulate real impact cost.
 *
 * @param book Source Order Book
 * @param side "BUY" (takes Asks) or "SELL" (hits Bids)
 * @param notionalAmount Dollar amount to trade
 */
export function calculateImpact(book: OrderBook, side: "BUY" | "SELL", notionalAmount: number): ExecutionSimulation {
    // 1. Select the side of the book to consume
    const levels = side === "BUY" ? book.asks : book.bids;

    if (!levels || levels.length === 0) {
        return { executedPrice: 0, totalShares: 0, slippagePercent: 0, filled: false, reason: "No Liquidity" };
    }

    let remainingAmount = notionalAmount;
    let totalSharesObj = 0;
    let totalCostObj = 0;

    // 2. Walk the Book
    for (const level of levels) {
        if (remainingAmount <= 0) break;

        const levelPrice = parseFloat(level.price);
        const levelSize = parseFloat(level.size);

        if (levelPrice <= 0 || levelSize <= 0) continue;

        const levelCost = levelPrice * levelSize;

        if (remainingAmount >= levelCost) {
            // Consume entire level
            totalCostObj += levelCost;
            totalSharesObj += levelSize;
            remainingAmount -= levelCost;
        } else {
            // Partial fill
            const sharesToTake = remainingAmount / levelPrice;
            totalCostObj += remainingAmount;
            totalSharesObj += sharesToTake;
            remainingAmount = 0;
        }
    }

    // 3. Validation
    if (remainingAmount > 1) { // Allow $1 dust tolerance
        return { executedPrice: 0, totalShares: 0, slippagePercent: 0, filled: false, reason: `Insufficient Depth (Unfilled: $${remainingAmount.toFixed(2)})` };
    }

    const avgPrice = totalCostObj / totalSharesObj;

    // Slippage calc: Compare Avg vs Top of Book
    const topPrice = parseFloat(levels[0].price);
    const slippage = Math.abs((avgPrice - topPrice) / topPrice);

    return {
        executedPrice: avgPrice,
        totalShares: totalSharesObj,
        slippagePercent: slippage,
        filled: true
    };
}
