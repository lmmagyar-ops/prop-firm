import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";
const redis = new Redis(REDIS_URL);

export interface MarketPrice {
    price: string;
    asset_id: string;
    timestamp?: number;
}

export interface OrderLevel {
    price: string;
    size: string; // Quantity of shares
}

export interface OrderBook {
    bids: OrderLevel[];
    asks: OrderLevel[];
    hash?: string;
}

export interface ExecutionSimulation {
    executedPrice: number;
    totalShares: number;
    slippagePercent: number;
    filled: boolean;
    reason?: string;
}

export class MarketService {

    /**
     * Fetches the latest price for an asset from Redis cache.
     */
    static async getLatestPrice(assetId: string): Promise<MarketPrice | null> {
        const key = `market:price:${assetId}`;
        const data = await redis.get(key);
        if (!data) return null;
        try {
            return JSON.parse(data) as MarketPrice;
        } catch (e) {
            return null;
        }
    }

    /**
     * Fetches the full Order Book from Redis (Snapshot).
     */
    static async getOrderBook(assetId: string): Promise<OrderBook | null> {
        const key = `market:book:${assetId}`;
        const data = await redis.get(key);
        if (!data) return null;
        try {
            return JSON.parse(data) as OrderBook;
        } catch (e) {
            return null;
        }
    }

    /**
     * Calculates the "Weighted Average Price" for a trade size.
     * Walks the book to simulate real impact cost.
     * 
     * @param book Source Order Book
     * @param side "BUY" (takes Asks) or "SELL" (hits Bids)
     * @param notionalAmount Dollar amount to trade
     */
    static calculateImpact(book: OrderBook, side: "BUY" | "SELL", notionalAmount: number): ExecutionSimulation {
        // 1. Select the side of the book to consume
        // BUY -> Consume Asks
        // SELL -> Consume Bids
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
            const levelSize = parseFloat(level.size); // Available shares

            if (levelPrice <= 0 || levelSize <= 0) continue;

            // Logic diff for BUY vs SELL if input is "Amount" ($).
            // Usually: 
            // BUY $1000 -> We need to spend $1000. 
            //   Level 1: 0.50, Size 1000 shares. Cost = $500. We take all. rem = 500.
            //   Level 2: 0.55, Size 1000 shares. Cost = $550. We take partial (500 / 0.55 = 909 shares).

            // SELL $1000 (Notional value of shares? Or assuming user specifies shares?)
            // In our `executeTrade` API, `amount` is Notional ($). 
            // So if I SELL $1000 worth of shares... wait. usually sell is "Sell 1000 shares".
            // Our Schema says `amount` is logic. Let's assume Input is Notional Dollars for simplicity of MVP.
            // Actually, in `trade.ts`, we calculate `shares = amount / price`.

            // For this Engine, let's strictly handle "DOLLAR AMOUNT SPENT (BUY)" or "SHARES SOLD (SELL)".
            // But `trade.ts` currently takes "amount" as dollar value for both.
            // Let's stick to Notional Walking for both for consistency with existing MVP.

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

    static isPriceFresh(priceData: MarketPrice, maxAgeMs = 60000): boolean {
        // Increased to 60s for demo mode with auto-provisioned data
        if (!priceData.timestamp) return true;
        return (Date.now() - priceData.timestamp) < maxAgeMs;
    }
}
