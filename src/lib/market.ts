import { isBookDead as _isBookDead, invertOrderBook as _invertOrderBook, buildSyntheticOrderBook, calculateImpact as _calculateImpact } from "./order-book-engine";
import { getErrorMessage, getErrorName } from "./errors";
import { getAllMarketData, getAllOrderBooks, getComplement, type AllMarketData } from "./worker-client";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Market");

export interface MarketPrice {
    price: string;
    asset_id: string;
    timestamp?: number;
    source?: 'live' | 'event_list' | 'gamma_api' | 'demo';  // Track data origin for integrity checks
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

// ── Types for cached event/market data (Gamma API format) ──
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

// PERF: Short-lived in-memory cache for parsed market data from the worker.
// Avoids re-fetching within the same request cycle.
interface MarketDataCache {
    data: AllMarketData;
    timestamp: number;
}
let marketDataCache: MarketDataCache | null = null;
const MARKET_DATA_CACHE_TTL = 5000; // 5 seconds

async function getCachedMarketData(): Promise<AllMarketData | null> {
    if (marketDataCache && Date.now() - marketDataCache.timestamp < MARKET_DATA_CACHE_TTL) {
        return marketDataCache.data;
    }

    const data = await getAllMarketData();
    if (data) {
        marketDataCache = { data, timestamp: Date.now() };
    }
    return data;
}

async function getParsedEventLists(): Promise<{ kalshiEvents: EventData[]; polyEvents: EventData[] }> {
    const data = await getCachedMarketData();
    if (!data) return { kalshiEvents: [], polyEvents: [] };

    return {
        kalshiEvents: (data.kalshi || []) as EventData[],
        polyEvents: (data.events || []) as EventData[],
    };
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
            const data = await getCachedMarketData();
            if (data?.markets) {
                const markets = data.markets as EventMarket[];
                const market = markets.find((m: EventMarket) => m.id === marketId);
                if (market) {
                    const price = market.currentPrice ?? market.basePrice;
                    if (Number.isFinite(price) && price !== undefined && price > 0 && price < 1) {
                        return price;
                    }
                }
            }

            // Gamma API fallback: fetch directly for markets not in worker cache
            const gammaPrice = await this.getGammaApiPrice(marketId);
            if (gammaPrice) {
                const price = parseFloat(gammaPrice.price);
                if (Number.isFinite(price) && price > 0 && price < 1) {
                    logger.info(`[MarketService] getCanonicalPrice using Gamma API for ${marketId.slice(0, 12)}...: ${price}`);
                    return price;
                }
            }

            return null;
        } catch (error) {
            logger.error('[MarketService] getCanonicalPrice error:', error);
            return null;
        }
    }

    /**
     * Gamma API fallback — fetches real price directly from Polymarket Gamma API.
     * Used when worker cache AND event lists don't have this market.
     * This is the last-resort before the hardcoded demo price.
     */
    private static async getGammaApiPrice(assetId: string): Promise<MarketPrice | null> {
        try {
            const url = `https://gamma-api.polymarket.com/markets?clob_token_ids=${assetId}`;
            const res = await fetch(url, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000)
            });

            if (!res.ok) {
                logger.warn(`[MarketService] Gamma API returned ${res.status} for ${assetId.slice(0, 12)}...`);
                return null;
            }

            const markets = await res.json();

            if (!Array.isArray(markets) || markets.length === 0) {
                logger.info(`[MarketService] Market ${assetId.slice(0, 12)}... not found in Gamma API`);
                return null;
            }

            const market = markets[0];

            // Parse outcomePrices to get YES price
            if (market.outcomePrices) {
                const prices = JSON.parse(market.outcomePrices) as string[];
                const yesPrice = parseFloat(prices[0] || '0.5');

                if (Number.isFinite(yesPrice) && yesPrice > 0 && yesPrice < 1) {
                    logger.info(`[MarketService] ✅ Gamma API price for ${assetId.slice(0, 12)}...: ${yesPrice}`);
                    return {
                        price: yesPrice.toString(),
                        asset_id: assetId,
                        timestamp: Date.now(),
                        source: 'gamma_api' as const
                    };
                }
            }

            return null;
        } catch (error: unknown) {
            logger.warn(`[MarketService] Gamma API fallback error for ${assetId.slice(0, 12)}...:`, getErrorMessage(error));
            return null;
        }
    }

    /**
     * Demo mode fallback data - used when ALL other sources are unavailable
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
     * Fetches the latest price for an asset from the worker's market data cache.
     * Falls back to event list data, then demo data if worker is unavailable.
     */
    static async getLatestPrice(assetId: string): Promise<MarketPrice | null> {
        try {
            // Try consolidated prices from worker (single HTTP call for all data)
            const data = await getCachedMarketData();
            if (data?.livePrices) {
                const entry = data.livePrices[assetId];
                if (entry?.price) {
                    return {
                        price: entry.price.toString(),
                        asset_id: assetId,
                        timestamp: Date.now(),
                        source: 'live' as const
                    };
                }
            }

            // Try to look up from event lists (already loaded, no additional call)
            const eventPrice = await this.lookupPriceFromEvents(assetId);
            if (eventPrice) return { ...eventPrice, source: 'event_list' as const };

            // Try Gamma API before falling back to demo
            const gammaPrice = await this.getGammaApiPrice(assetId);
            if (gammaPrice) return gammaPrice;

            logger.info(`[MarketService] No price data for ${assetId}, using demo fallback`);
            return { ...this.getDemoPrice(assetId), source: 'demo' as const };
        } catch (error: unknown) {
            logger.error(`[MarketService] Worker error, using demo fallback:`, getErrorMessage(error));
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
            // PERF: Use cached market data instead of re-parsing per call
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

            logger.info(`[MarketService] Batch fetched ${results.size}/${marketIds.length} prices`);
        } catch (error: unknown) {
            logger.error(`[MarketService] Batch price error:`, getErrorMessage(error));
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
            // Fetch ALL order books from worker (1 HTTP call instead of Redis)
            const allBooks = await getAllOrderBooks() as Record<string, OrderBook> | null;

            for (const marketId of marketIds) {
                const book = allBooks?.[marketId];

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
                        logger.warn(`[MarketService] Invalid order book price for ${marketId.slice(0, 12)}...: ${bestBid} (rejected, using fallback)`);
                    }
                }

                // Fallback: try event list price (better than demo)
                const eventPrice = await this.lookupPriceFromEvents(marketId);
                if (eventPrice) {
                    results.set(marketId, { ...eventPrice, source: 'event_list' });
                } else {
                    // Try Gamma API before demo fallback
                    const gammaPrice = await this.getGammaApiPrice(marketId);
                    if (gammaPrice) {
                        results.set(marketId, gammaPrice);
                    } else {
                        results.set(marketId, { ...this.getDemoPrice(marketId), source: 'demo' });
                    }
                }
            }

            logger.info(`[MarketService] Batch fetched ${results.size}/${marketIds.length} order book prices`);
        } catch (error: unknown) {
            logger.error(`[MarketService] Batch order book error:`, getErrorMessage(error));
            // Fallback to event list prices, then Gamma API
            for (const marketId of marketIds) {
                const eventPrice = await this.lookupPriceFromEvents(marketId);
                if (eventPrice) {
                    results.set(marketId, { ...eventPrice, source: 'event_list' });
                } else {
                    const gammaPrice = await this.getGammaApiPrice(marketId);
                    if (gammaPrice) {
                        results.set(marketId, gammaPrice);
                    } else {
                        results.set(marketId, { ...this.getDemoPrice(marketId), source: 'demo' });
                    }
                }
            }
        }

        return results;
    }

    /**
     * Batch fetch market titles from event lists, with DB fallback for resolved markets
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

            // DB fallback: resolved markets won't be in live event lists
            const missingIds = marketIds.filter(id => !results.has(id));
            if (missingIds.length > 0) {
                try {
                    const { db } = await import("@/db");
                    const { trades } = await import("@/db/schema");
                    const { inArray } = await import("drizzle-orm");
                    const tradeRecords = await db.query.trades.findMany({
                        where: inArray(trades.marketId, missingIds),
                        columns: { marketId: true, marketTitle: true }
                    });
                    for (const t of tradeRecords) {
                        if (t.marketTitle && !results.has(t.marketId)) {
                            results.set(t.marketId, t.marketTitle);
                        }
                    }
                } catch (dbError: unknown) {
                    logger.error(`[MarketService] DB title fallback error:`, getErrorMessage(dbError));
                }
            }
        } catch (error: unknown) {
            logger.error(`[MarketService] Batch titles error:`, getErrorMessage(error));
        }

        return results;
    }

    /**
     * Look up price from event lists (kalshi/polymarket data from worker).
     * Falls back to binary market list for markets not in featured events.
     * This allows us to get live prices for position P&L calculations
     */
    static async lookupPriceFromEvents(marketId: string): Promise<MarketPrice | null> {
        try {
            // PERF: Use cached market data instead of re-parsing per call
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

            // FALLBACK: Check binary market list for markets not in featured events
            const data = await getCachedMarketData();
            if (data?.markets) {
                const markets = data.markets as EventMarket[];
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
            logger.error('[MarketService] Error looking up price from events:', error);
            return null;
        }
    }

    /**
     * Fetches the full Order Book from worker's cache.
     * Falls back to synthetic book from event list price, then demo data.
     */
    static async getOrderBook(assetId: string): Promise<OrderBook | null> {
        try {
            // Fetch from worker's order book cache
            const allBooks = await getAllOrderBooks() as Record<string, OrderBook> | null;
            if (allBooks?.[assetId]) {
                return { ...allBooks[assetId], source: 'live' as const };
            }

            // Try to build synthetic order book from event list price
            const livePrice = await this.lookupPriceFromEvents(assetId);
            if (livePrice) {
                const price = parseFloat(livePrice.price);
                logger.info(`[MarketService] Building synthetic orderbook for ${assetId.slice(0, 12)}... at price ${price}`);
                return { ...this.buildSyntheticOrderBookPublic(price), source: 'synthetic' as const };
            }
            logger.info(`[MarketService] No orderbook for ${assetId}, using demo fallback`);
            return { ...this.getDemoOrderBook(), source: 'demo' as const };
        } catch (error: unknown) {
            logger.error(`[MarketService] Orderbook error, using demo fallback:`, getErrorMessage(error));
            return { ...this.getDemoOrderBook(), source: 'demo' as const };
        }
    }

    /**
     * Fetches a FRESH order book directly from Polymarket's CLOB API.
     * Bypasses worker cache entirely — used exclusively for trade execution.
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
                logger.warn(`[MarketService] YES book dead for ${tokenId.slice(0, 12)}... — trying complement (NO) token`);

                // Look up the complement (NO) token from the worker
                const complementTokenId = await getComplement(tokenId);

                if (complementTokenId) {
                    const noBook = await this.fetchClobBook(complementTokenId);

                    if (noBook && !this.isBookDead(noBook)) {
                        // Invert the NO book to create a valid YES book:
                        // NO bids (someone buys NO at X) → YES asks (sell YES at 1-X)
                        // NO asks (someone sells NO at X) → YES bids (buy YES at 1-X)
                        const invertedBook = this.invertOrderBook(noBook);
                        logger.info(`[MarketService] ✅ Using INVERTED complement book for ${tokenId.slice(0, 12)}... (${invertedBook.bids?.length || 0} bids, ${invertedBook.asks?.length || 0} asks)`);
                        return { ...invertedBook, source: 'live' as const };
                    }
                }

                logger.warn(`[MarketService] Complement book also unavailable for ${tokenId.slice(0, 12)}...`);

                // CRITICAL FIX: Don't return the dead YES book or stale cached book.
                // Instead, build a synthetic book from the EVENT LIST price (Gamma API),
                // which correctly aggregates both YES and NO token prices.
                const eventPrice = await this.lookupPriceFromEvents(tokenId);
                if (eventPrice) {
                    const price = parseFloat(eventPrice.price);
                    logger.info(`[MarketService] 🔧 Building SYNTHETIC book from event list price (${price}) for ${tokenId.slice(0, 12)}...`);
                    return { ...this.buildSyntheticOrderBookPublic(price), source: 'synthetic' as const };
                }

                // Try Gamma API as last resort before returning dead book
                const gammaPrice = await this.getGammaApiPrice(tokenId);
                if (gammaPrice) {
                    const price = parseFloat(gammaPrice.price);
                    logger.info(`[MarketService] 🔧 Building SYNTHETIC book from Gamma API price (${price}) for ${tokenId.slice(0, 12)}...`);
                    return { ...this.buildSyntheticOrderBookPublic(price), source: 'synthetic' as const };
                }

                logger.warn(`[MarketService] No event list or Gamma price — returning dead book for ${tokenId.slice(0, 12)}...`);
            }

            logger.info(`[MarketService] ✅ Fresh order book fetched for ${tokenId.slice(0, 12)}... (${book.bids?.length || 0} bids, ${book.asks?.length || 0} asks)`);
            return { ...book, source: 'live' as const };
        } catch (error: unknown) {
            if (getErrorName(error) === 'AbortError') {
                logger.warn(`[MarketService] Fresh book fetch TIMED OUT for ${tokenId.slice(0, 12)}..., using cached`);
            } else {
                logger.warn(`[MarketService] Fresh book fetch error for ${tokenId.slice(0, 12)}...:`, getErrorMessage(error));
            }
            // Fall back to cached order book
            return this.getOrderBook(tokenId);
        }
    }

    /**
     * Fetch a single CLOB order book with timeout.
     * NOTE: This goes directly to Polymarket's CLOB API — not through our worker.
     * This is intentional: trade execution needs the freshest possible data.
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
                logger.warn(`[MarketService] CLOB fetch failed (${res.status}) for ${tokenId.slice(0, 12)}...`);
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
                logger.warn(`[MarketService] CLOB fetch TIMED OUT for ${tokenId.slice(0, 12)}...`);
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
