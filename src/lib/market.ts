import Redis from "ioredis";

// Support both Upstash (REDIS_HOST/PASSWORD) and local (REDIS_URL) configs
function createRedisClient(): Redis {
    // Production: Use Upstash with TLS
    if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
        return new Redis({
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
            tls: {}, // Required for Upstash
            connectTimeout: 5000,
            commandTimeout: 5000,
            maxRetriesPerRequest: 1,
            lazyConnect: true,
        });
    }

    // Local: Use REDIS_URL
    return new Redis(process.env.REDIS_URL || "redis://localhost:6380", {
        connectTimeout: 5000,
        commandTimeout: 5000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
    });
}

// Lazy Redis singleton with connection timeout to prevent hanging on serverless
let redisInstance: Redis | null = null;

function getRedis(): Redis {
    if (!redisInstance) {
        redisInstance = createRedisClient();

        redisInstance.on('error', (err) => {
            console.error('[MarketService] Redis error:', err.message);
        });
    }
    return redisInstance;
}

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
     * Demo mode fallback data - used when Redis is unavailable
     */
    private static getDemoPrice(assetId: string): MarketPrice {
        return {
            price: "0.55",
            asset_id: assetId,
            timestamp: Date.now()
        };
    }

    private static getDemoOrderBook(): OrderBook {
        return {
            bids: [
                { price: "0.55", size: "50000" },
                { price: "0.54", size: "50000" },
                { price: "0.53", size: "50000" }
            ],
            asks: [
                { price: "0.56", size: "50000" },
                { price: "0.57", size: "50000" },
                { price: "0.58", size: "50000" }
            ]
        };
    }

    /**
     * Fetches the latest price for an asset from Redis cache.
     * Falls back to demo data if Redis is unavailable.
     */
    static async getLatestPrice(assetId: string): Promise<MarketPrice | null> {
        try {
            const key = `market:price:${assetId}`;
            const data = await getRedis().get(key);
            if (!data) {
                // Try to look up from event lists instead
                const eventPrice = await this.lookupPriceFromEvents(assetId);
                if (eventPrice) return eventPrice;

                console.log(`[MarketService] No Redis data for ${assetId}, using demo fallback`);
                return this.getDemoPrice(assetId);
            }
            return JSON.parse(data) as MarketPrice;
        } catch (error: any) {
            console.error(`[MarketService] Redis error, using demo fallback:`, error.message);
            return this.getDemoPrice(assetId);
        }
    }

    /**
     * Batch fetch prices for multiple assets in a single operation.
     * Uses event lists for live prices, reducing N+1 query overhead.
     */
    static async getBatchPrices(marketIds: string[]): Promise<Map<string, MarketPrice>> {
        const results = new Map<string, MarketPrice>();

        if (marketIds.length === 0) return results;

        try {
            const redis = getRedis();

            // Load event lists once (instead of per-market)
            const [kalshiData, polyData] = await Promise.all([
                redis.get('kalshi:active_list'),
                redis.get('event:active_list')
            ]);

            // Build market lookup maps
            const kalshiMarkets = new Map<string, any>();
            const polyMarkets = new Map<string, any>();

            if (kalshiData) {
                const events = JSON.parse(kalshiData);
                for (const event of events) {
                    for (const market of event.markets || []) {
                        kalshiMarkets.set(market.id, market);
                    }
                }
            }

            if (polyData) {
                const events = JSON.parse(polyData);
                for (const event of events) {
                    for (const market of event.markets || []) {
                        polyMarkets.set(market.id, market);
                    }
                }
            }

            // Fetch prices for each market from the preloaded maps
            for (const marketId of marketIds) {
                let market = kalshiMarkets.get(marketId) || polyMarkets.get(marketId);

                if (market) {
                    results.set(marketId, {
                        price: market.price.toString(),
                        asset_id: marketId,
                        timestamp: Date.now()
                    });
                } else {
                    // Fallback to demo price if not found
                    results.set(marketId, this.getDemoPrice(marketId));
                }
            }

            console.log(`[MarketService] Batch fetched ${results.size}/${marketIds.length} prices`);
        } catch (error: any) {
            console.error(`[MarketService] Batch price error:`, error.message);
            // Fallback to demo prices for all
            for (const marketId of marketIds) {
                results.set(marketId, this.getDemoPrice(marketId));
            }
        }

        return results;
    }

    /**
     * Look up price from event lists (kalshi:active_list or event:active_list)
     * This allows us to get live prices for position P&L calculations
     */
    static async lookupPriceFromEvents(marketId: string): Promise<MarketPrice | null> {
        try {
            const redis = getRedis();

            // Try Kalshi first (marketId might be a ticker like KXPREZ2028-28-JVAN)
            const kalshiData = await redis.get('kalshi:active_list');
            if (kalshiData) {
                const events = JSON.parse(kalshiData);
                for (const event of events) {
                    const market = event.markets?.find((m: any) => m.id === marketId);
                    if (market) {
                        return {
                            price: market.price.toString(),
                            asset_id: marketId,
                            timestamp: Date.now()
                        };
                    }
                }
            }

            // Try Polymarket
            const polyData = await redis.get('event:active_list');
            if (polyData) {
                const events = JSON.parse(polyData);
                for (const event of events) {
                    const market = event.markets?.find((m: any) => m.id === marketId);
                    if (market) {
                        return {
                            price: market.price.toString(),
                            asset_id: marketId,
                            timestamp: Date.now()
                        };
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('[MarketService] Error looking up price from events:', error);
            return null;
        }
    }

    /**
     * Fetches the full Order Book from Redis (Snapshot).
     * Falls back to synthetic book from event list price, then demo data.
     */
    static async getOrderBook(assetId: string): Promise<OrderBook | null> {
        try {
            const key = `market:book:${assetId}`;
            const data = await getRedis().get(key);
            if (!data) {
                // Try to build synthetic order book from event list price
                const livePrice = await this.lookupPriceFromEvents(assetId);
                if (livePrice) {
                    const price = parseFloat(livePrice.price);
                    console.log(`[MarketService] Building synthetic orderbook for ${assetId.slice(0, 12)}... at price ${price}`);
                    return this.buildSyntheticOrderBook(price);
                }
                console.log(`[MarketService] No Redis orderbook for ${assetId}, using demo fallback`);
                return this.getDemoOrderBook();
            }
            return JSON.parse(data) as OrderBook;
        } catch (error: any) {
            console.error(`[MarketService] Redis orderbook error, using demo fallback:`, error.message);
            return this.getDemoOrderBook();
        }
    }

    /**
     * Build a synthetic order book from a known price.
     * Simulates deep liquidity around the current price.
     */
    private static buildSyntheticOrderBook(price: number): OrderBook {
        // Create bids slightly below and asks slightly above the current price
        const spread = 0.01; // 1 cent spread
        return {
            bids: [
                { price: Math.max(0.01, price - spread).toFixed(2), size: "50000" },
                { price: Math.max(0.01, price - spread * 2).toFixed(2), size: "50000" },
                { price: Math.max(0.01, price - spread * 3).toFixed(2), size: "50000" }
            ],
            asks: [
                { price: Math.min(0.99, price + spread).toFixed(2), size: "50000" },
                { price: Math.min(0.99, price + spread * 2).toFixed(2), size: "50000" },
                { price: Math.min(0.99, price + spread * 3).toFixed(2), size: "50000" }
            ]
        };
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
