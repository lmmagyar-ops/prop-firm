import Redis from "ioredis";
import { isBookDead as _isBookDead, invertOrderBook as _invertOrderBook, buildSyntheticOrderBook, calculateImpact as _calculateImpact } from "./order-book-engine";
import { getErrorMessage, getErrorName } from "./errors";

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
            console.error('[MarketService] Redis error:', getErrorMessage(err));
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

// ── Types for Redis-cached event/market data (Gamma API format) ──
interface EventMarket {
    id: string;
    price: string;
    title?: string;
    currentPrice?: number;
    basePrice?: number;
}

interface EventData {
    title?: string;
    markets?: EventMarket[];
}

// PERF: Short-lived in-memory cache for parsed event lists.
// Avoids re-parsing ~500KB JSON blobs multiple times per request cycle.
interface EventListCache {
    kalshiEvents: EventData[];
    polyEvents: EventData[];
    timestamp: number;
}
let eventListCache: EventListCache | null = null;
const EVENT_LIST_CACHE_TTL = 5000; // 5 seconds

async function getParsedEventLists(): Promise<{ kalshiEvents: EventData[]; polyEvents: EventData[] }> {
    if (eventListCache && Date.now() - eventListCache.timestamp < EVENT_LIST_CACHE_TTL) {
        return eventListCache;
    }

    const redis = getRedis();
    const [kalshiData, polyData] = await Promise.all([
        redis.get('kalshi:active_list'),
        redis.get('event:active_list'),
    ]);

    const kalshiEvents = kalshiData ? JSON.parse(kalshiData) : [];
    const polyEvents = polyData ? JSON.parse(polyData) : [];

    eventListCache = { kalshiEvents, polyEvents, timestamp: Date.now() };
    return eventListCache;
}

export class MarketService {

    /**
     * CANONICAL PRICE — Single source of truth for trade execution.
     * 
     * Returns the Gamma API event list price, which correctly aggregates
     * both YES and NO token liquidity into one accurate price.
     * 
     * This is the ONLY price source the trade engine should use.
     * Returns null if the market isn't found in any event list.
     */
    static async getCanonicalPrice(marketId: string): Promise<number | null> {
        try {
            const { kalshiEvents, polyEvents } = await getParsedEventLists();

            // Search Kalshi events
            for (const event of kalshiEvents) {
                const market = event.markets?.find((m: EventMarket) => m.id === marketId);
                if (market) {
                    const price = parseFloat(market.price);
                    if (Number.isFinite(price) && price > 0 && price < 1) {
                        return price;
                    }
                }
            }

            // Search Polymarket events
            for (const event of polyEvents) {
                const market = event.markets?.find((m: EventMarket) => m.id === marketId);
                if (market) {
                    const price = parseFloat(market.price);
                    if (Number.isFinite(price) && price > 0 && price < 1) {
                        return price;
                    }
                }
            }

            // Fallback: binary market list
            const redis = getRedis();
            const binaryData = await redis.get('market:active_list');
            if (binaryData) {
                const markets = JSON.parse(binaryData);
                const market = markets.find((m: EventMarket) => m.id === marketId);
                if (market) {
                    const price = market.currentPrice ?? market.basePrice;
                    if (Number.isFinite(price) && price > 0 && price < 1) {
                        return price;
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('[MarketService] getCanonicalPrice error:', error);
            return null;
        }
    }

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
        // PARITY FIX (Jan 2026): Reduced from 50K to 5K shares for realistic depth
        return {
            bids: [
                { price: "0.55", size: "5000" },
                { price: "0.53", size: "5000" },
                { price: "0.51", size: "5000" }
            ],
            asks: [
                { price: "0.57", size: "5000" },
                { price: "0.59", size: "5000" },
                { price: "0.61", size: "5000" }
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
        } catch (error: unknown) {
            console.error(`[MarketService] Redis error, using demo fallback:`, getErrorMessage(error));
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
            // PERF: Use cached event lists instead of re-parsing per call
            const { kalshiEvents, polyEvents } = await getParsedEventLists();

            // Build market lookup maps
            const kalshiMarkets = new Map<string, EventMarket>();
            const polyMarkets = new Map<string, EventMarket>();

            for (const event of kalshiEvents) {
                for (const market of event.markets || []) {
                    kalshiMarkets.set(market.id, market);
                }
            }

            for (const event of polyEvents) {
                for (const market of event.markets || []) {
                    polyMarkets.set(market.id, market);
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
        } catch (error: unknown) {
            console.error(`[MarketService] Batch price error:`, getErrorMessage(error));
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
        } catch (error: unknown) {
            console.error(`[MarketService] Batch order book error:`, getErrorMessage(error));
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
            // PERF: Use cached event lists instead of re-parsing per call
            const { kalshiEvents, polyEvents } = await getParsedEventLists();

            // Build title lookup maps
            for (const event of kalshiEvents) {
                for (const market of event.markets || []) {
                    if (marketIds.includes(market.id)) {
                        results.set(market.id, market.title || event.title || market.id);
                    }
                }
            }

            for (const event of polyEvents) {
                for (const market of event.markets || []) {
                    if (marketIds.includes(market.id)) {
                        results.set(market.id, market.title || event.title || market.id);
                    }
                }
            }
        } catch (error: unknown) {
            console.error(`[MarketService] Batch titles error:`, getErrorMessage(error));
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
            // PERF: Use cached event lists instead of re-parsing per call
            const { kalshiEvents, polyEvents } = await getParsedEventLists();

            // Try Kalshi first (marketId might be a ticker like KXPREZ2028-28-JVAN)
            for (const event of kalshiEvents) {
                const market = event.markets?.find((m: EventMarket) => m.id === marketId);
                if (market) {
                    const price = parseFloat(market.price);
                    // Skip invalid/stale prices that indicate resolved markets
                    if (price > 0.01 && price < 0.99) {
                        return {
                            price: market.price.toString(),
                            asset_id: marketId,
                            timestamp: Date.now()
                        };
                    }
                    // Invalid price - fall through to next lookup
                }
            }

            // Try Polymarket featured events
            for (const event of polyEvents) {
                const market = event.markets?.find((m: EventMarket) => m.id === marketId);
                if (market) {
                    const price = parseFloat(market.price);
                    // Skip invalid/stale prices that indicate resolved markets
                    if (price > 0.01 && price < 0.99) {
                        return {
                            price: market.price.toString(),
                            asset_id: marketId,
                            timestamp: Date.now()
                        };
                    }
                    // Invalid price - fall through to next lookup
                }
            }

            // FALLBACK: Check market:active_list for binary markets not in featured events
            // These are high-volume single-outcome markets displayed in the grid
            const redis = getRedis();
            const binaryData = await redis.get('market:active_list');
            if (binaryData) {
                const markets = JSON.parse(binaryData);
                const market = markets.find((m: EventMarket) => m.id === marketId);
                if (market) {
                    const price = market.currentPrice ?? market.basePrice ?? 0.5;
                    // Skip invalid/stale prices that indicate resolved markets
                    if (price > 0.01 && price < 0.99) {
                        return {
                            price: price.toString(),
                            asset_id: marketId,
                            timestamp: Date.now(),
                            source: 'event_list' as const
                        };
                    }
                    // Invalid price - fall through to demo price
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
        } catch (error: unknown) {
            console.error(`[MarketService] Redis orderbook error, using demo fallback:`, getErrorMessage(error));
            return { ...this.getDemoOrderBook(), source: 'demo' as const };
        }
    }

    /**
     * Fetches a FRESH order book directly from Polymarket's CLOB API.
     * Bypasses Redis cache entirely — used exclusively for trade execution.
     * This guarantees the execution price matches current market conditions.
     * 
     * DUAL-TOKEN FIX: If the YES token's book is dead (huge spread),
     * falls back to the complement (NO) token and inverts its book.
     * This handles markets where all liquidity is on the NO side.
     * 
     * Falls back to cached order book if the fresh fetch fails.
     */
    static async getOrderBookFresh(tokenId: string): Promise<OrderBook | null> {
        try {
            const book = await this.fetchClobBook(tokenId);

            if (!book) {
                return this.getOrderBook(tokenId);
            }

            // Check if this book is "dead" — huge spread or asks far from reasonable
            if (this.isBookDead(book)) {
                console.warn(`[MarketService] YES book dead for ${tokenId.slice(0, 12)}... — trying complement (NO) token`);

                // Look up the complement (NO) token from Redis
                const complementTokenId = await getRedis().hget('market:complements', tokenId);

                if (complementTokenId) {
                    const noBook = await this.fetchClobBook(complementTokenId);

                    if (noBook && !this.isBookDead(noBook)) {
                        // Invert the NO book to create a valid YES book:
                        // NO bids (someone buys NO at X) → YES asks (sell YES at 1-X)
                        // NO asks (someone sells NO at X) → YES bids (buy YES at 1-X)
                        const invertedBook = this.invertOrderBook(noBook);
                        console.log(`[MarketService] ✅ Using INVERTED complement book for ${tokenId.slice(0, 12)}... (${invertedBook.bids?.length || 0} bids, ${invertedBook.asks?.length || 0} asks)`);
                        return { ...invertedBook, source: 'live' as const };
                    }
                }

                console.warn(`[MarketService] Complement book also unavailable for ${tokenId.slice(0, 12)}...`);

                // CRITICAL FIX: Don't return the dead YES book or stale cached book.
                // Instead, build a synthetic book from the EVENT LIST price (Gamma API),
                // which correctly aggregates both YES and NO token prices.
                const eventPrice = await this.lookupPriceFromEvents(tokenId);
                if (eventPrice) {
                    const price = parseFloat(eventPrice.price);
                    console.log(`[MarketService] 🔧 Building SYNTHETIC book from event list price (${price}) for ${tokenId.slice(0, 12)}...`);
                    return { ...this.buildSyntheticOrderBookPublic(price), source: 'synthetic' as const };
                }

                console.warn(`[MarketService] No event list price either — returning dead book for ${tokenId.slice(0, 12)}...`);
            }

            console.log(`[MarketService] ✅ Fresh order book fetched for ${tokenId.slice(0, 12)}... (${book.bids?.length || 0} bids, ${book.asks?.length || 0} asks)`);
            return { ...book, source: 'live' as const };
        } catch (error: unknown) {
            if (getErrorName(error) === 'AbortError') {
                console.warn(`[MarketService] Fresh book fetch TIMED OUT for ${tokenId.slice(0, 12)}..., using cached`);
            } else {
                console.warn(`[MarketService] Fresh book fetch error for ${tokenId.slice(0, 12)}...:`, getErrorMessage(error));
            }
            // Fall back to cached order book
            return this.getOrderBook(tokenId);
        }
    }

    /**
     * Fetch a single CLOB order book with timeout.
     */
    private static async fetchClobBook(tokenId: string): Promise<OrderBook | null> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        try {
            const res = await fetch(
                `https://clob.polymarket.com/book?token_id=${tokenId}`,
                { signal: controller.signal }
            );
            clearTimeout(timeout);

            if (!res.ok) {
                console.warn(`[MarketService] CLOB fetch failed (${res.status}) for ${tokenId.slice(0, 12)}...`);
                return null;
            }

            const book: OrderBook = await res.json();

            if (!book.bids?.length && !book.asks?.length) {
                return null;
            }

            return book;
        } catch (error: unknown) {
            clearTimeout(timeout);
            if (getErrorName(error) === 'AbortError') {
                console.warn(`[MarketService] CLOB fetch TIMED OUT for ${tokenId.slice(0, 12)}...`);
            }
            return null;
        }
    }

    // ── Delegators to order-book-engine.ts (pure functions) ─────────
    private static isBookDead(book: OrderBook): boolean { return _isBookDead(book); }
    private static invertOrderBook(noBook: OrderBook): OrderBook { return _invertOrderBook(noBook); }
    static buildSyntheticOrderBookPublic(price: number): OrderBook { return buildSyntheticOrderBook(price); }
    static calculateImpact(book: OrderBook, side: "BUY" | "SELL", notionalAmount: number): ExecutionSimulation { return _calculateImpact(book, side, notionalAmount); }

    static isPriceFresh(priceData: MarketPrice, maxAgeMs = 60000): boolean {
        // Increased to 60s for demo mode with auto-provisioned data
        if (!priceData.timestamp) return true;
        return (Date.now() - priceData.timestamp) < maxAgeMs;
    }
}
