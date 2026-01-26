import Redis from "ioredis";

// Priority: REDIS_URL (Railway) > REDIS_HOST/PASSWORD (legacy Upstash) > localhost
function createRedisClient(): Redis {
    // Priority 1: Use REDIS_URL if set (Railway or any standard Redis)
    if (process.env.REDIS_URL) {
        return new Redis(process.env.REDIS_URL, {
            connectTimeout: 5000,
            commandTimeout: 5000,
            maxRetriesPerRequest: 1,
            lazyConnect: true,
        });
    }

    // Priority 2: Legacy Upstash with TLS (deprecated)
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

    // Priority 3: Local development fallback
    return new Redis("redis://localhost:6380", {
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
    source?: 'live' | 'event_list' | 'demo';  // Track data origin for integrity checks
}

export interface OrderLevel {
    price: string;
    size: string; // Quantity of shares
}

export interface OrderBook {
    bids: OrderLevel[];
    asks: OrderLevel[];
    hash?: string;
    source?: 'live' | 'synthetic' | 'demo';  // Track data origin for integrity checks
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
     * Falls back to event list data, then demo data if Redis is unavailable.
     */
    static async getLatestPrice(assetId: string): Promise<MarketPrice | null> {
        try {
            // Try consolidated prices key first (new format - 1 Redis call)
            const allPricesData = await getRedis().get('market:prices:all');
            if (allPricesData) {
                try {
                    const allPrices = JSON.parse(allPricesData);
                    if (allPrices[assetId]) {
                        const parsed = allPrices[assetId];
                        return {
                            price: parsed.price?.toString() || '0.5',
                            asset_id: assetId,
                            timestamp: parsed.timestamp || Date.now(),
                            source: 'live' as const
                        };
                    }
                } catch {
                    // Invalid JSON, continue to fallback
                }
            }

            // Try to look up from event lists (already loaded, no additional Redis call)
            const eventPrice = await this.lookupPriceFromEvents(assetId);
            if (eventPrice) return { ...eventPrice, source: 'event_list' as const };

            console.log(`[MarketService] No price data for ${assetId}, using demo fallback`);
            return { ...this.getDemoPrice(assetId), source: 'demo' as const };
        } catch (error: any) {
            console.error(`[MarketService] Redis error, using demo fallback:`, error.message);
            return { ...this.getDemoPrice(assetId), source: 'demo' as const };
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
                const market = kalshiMarkets.get(marketId) || polyMarkets.get(marketId);

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
     * Batch fetch prices from ORDER BOOKS (same source as trade execution).
     * This ensures PnL display matches the prices used for trade execution.
     * Uses bid price for mark-to-market (what you could actually sell at).
     */
    static async getBatchOrderBookPrices(marketIds: string[]): Promise<Map<string, MarketPrice>> {
        const results = new Map<string, MarketPrice>();

        if (marketIds.length === 0) return results;

        try {
            const redis = getRedis();

            // Fetch ALL order books from single key (1 Redis call instead of N)
            const allBooksData = await redis.get('market:orderbooks');
            let allBooks: Record<string, OrderBook> = {};

            if (allBooksData) {
                try {
                    allBooks = JSON.parse(allBooksData);
                } catch {
                    console.warn('[MarketService] Failed to parse orderbooks cache');
                }
            }

            for (const marketId of marketIds) {
                const book = allBooks[marketId];

                if (book) {
                    // Use best bid (what you could sell at) for mark-to-market
                    const bestBid = book.bids?.[0]?.price;
                    const bidPrice = parseFloat(bestBid || '0');

                    // CRITICAL: Validate price is in valid range for active markets
                    // Prices ≤0.01 or ≥0.99 indicate resolved/invalid data
                    if (bidPrice > 0.01 && bidPrice < 0.99) {
                        results.set(marketId, {
                            price: bestBid,
                            asset_id: marketId,
                            timestamp: Date.now(),
                            source: 'live'
                        });
                        continue;
                    } else if (bestBid) {
                        // Log invalid prices for debugging
                        console.warn(`[MarketService] Invalid order book price for ${marketId.slice(0, 12)}...: ${bestBid} (rejected, using fallback)`);
                    }
                }

                // Fallback: try event list price (better than demo)
                const eventPrice = await this.lookupPriceFromEvents(marketId);
                if (eventPrice) {
                    results.set(marketId, { ...eventPrice, source: 'event_list' });
                } else {
                    results.set(marketId, { ...this.getDemoPrice(marketId), source: 'demo' });
                }
            }

            console.log(`[MarketService] Batch fetched ${results.size}/${marketIds.length} order book prices`);
        } catch (error: any) {
            console.error(`[MarketService] Batch order book error:`, error.message);
            // Fallback to event list prices
            for (const marketId of marketIds) {
                const eventPrice = await this.lookupPriceFromEvents(marketId);
                if (eventPrice) {
                    results.set(marketId, { ...eventPrice, source: 'event_list' });
                } else {
                    results.set(marketId, { ...this.getDemoPrice(marketId), source: 'demo' });
                }
            }
        }

        return results;
    }

    /**
     * Batch fetch market titles from Redis event lists
     */
    static async getBatchTitles(marketIds: string[]): Promise<Map<string, string>> {
        const results = new Map<string, string>();

        if (marketIds.length === 0) return results;

        try {
            const redis = getRedis();

            // Load event lists once
            const [kalshiData, polyData] = await Promise.all([
                redis.get('kalshi:active_list'),
                redis.get('event:active_list')
            ]);

            // Build title lookup maps
            if (kalshiData) {
                const events = JSON.parse(kalshiData);
                for (const event of events) {
                    for (const market of event.markets || []) {
                        if (marketIds.includes(market.id)) {
                            results.set(market.id, market.title || event.title);
                        }
                    }
                }
            }

            if (polyData) {
                const events = JSON.parse(polyData);
                for (const event of events) {
                    for (const market of event.markets || []) {
                        if (marketIds.includes(market.id)) {
                            results.set(market.id, market.title || event.title);
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error(`[MarketService] Batch titles error:`, error.message);
        }

        return results;
    }

    /**
     * Look up price from event lists (kalshi:active_list or event:active_list)
     * Falls back to market:active_list for binary markets not in featured events.
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

            // Try Polymarket featured events
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

            // FALLBACK: Check market:active_list for binary markets not in featured events
            // These are high-volume single-outcome markets displayed in the grid
            const binaryData = await redis.get('market:active_list');
            if (binaryData) {
                const markets = JSON.parse(binaryData);
                const market = markets.find((m: any) => m.id === marketId);
                if (market) {
                    const price = market.currentPrice ?? market.basePrice ?? 0.5;
                    return {
                        price: price.toString(),
                        asset_id: marketId,
                        timestamp: Date.now(),
                        source: 'event_list' as const  // Treat as live data since it came from ingestion
                    };
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
            // Try single-key cache first (new format)
            const allBooksData = await getRedis().get('market:orderbooks');
            if (allBooksData) {
                try {
                    const allBooks = JSON.parse(allBooksData);
                    if (allBooks[assetId]) {
                        return { ...allBooks[assetId], source: 'live' as const };
                    }
                } catch {
                    // Invalid JSON, continue to fallback
                }
            }

            // Fallback to legacy individual key (for backwards compat)
            const legacyData = await getRedis().get(`market:book:${assetId}`);
            if (legacyData) {
                const parsed = JSON.parse(legacyData) as OrderBook;
                return { ...parsed, source: 'live' as const };
            }

            // Try to build synthetic order book from event list price
            const livePrice = await this.lookupPriceFromEvents(assetId);
            if (livePrice) {
                const price = parseFloat(livePrice.price);
                console.log(`[MarketService] Building synthetic orderbook for ${assetId.slice(0, 12)}... at price ${price}`);
                return { ...this.buildSyntheticOrderBookPublic(price), source: 'synthetic' as const };
            }
            console.log(`[MarketService] No Redis orderbook for ${assetId}, using demo fallback`);
            return { ...this.getDemoOrderBook(), source: 'demo' as const };
        } catch (error: any) {
            console.error(`[MarketService] Redis orderbook error, using demo fallback:`, error.message);
            return { ...this.getDemoOrderBook(), source: 'demo' as const };
        }
    }

    /**
     * Build a synthetic order book from a known price.
     * Simulates deep liquidity around the current price.
     * Public for use by TradeExecutor price integrity checks.
     */
    static buildSyntheticOrderBookPublic(price: number): OrderBook {
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
