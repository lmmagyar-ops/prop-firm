"use server";

import Redis, { RedisOptions } from "ioredis";

import { unstable_noStore as noStore } from "next/cache";

type RedisConfig = string | RedisOptions;

// Priority: REDIS_URL (Railway) > REDIS_HOST/PASSWORD (legacy Upstash) > localhost
const getRedisConfig = (): RedisConfig => {
    // Priority 1: Use REDIS_URL if set (Railway or any standard Redis)
    if (process.env.REDIS_URL) {
        return process.env.REDIS_URL;
    }
    // Priority 2: Legacy Upstash with TLS (deprecated)
    if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
        return {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
            tls: {} // Required for Upstash
        };
    }
    // Priority 3: Local development fallback
    return "redis://localhost:6380";
};

const redisConfig = getRedisConfig();
const redis = typeof redisConfig === 'string'
    ? new Redis(redisConfig)
    : new Redis(redisConfig);

export interface MarketMetadata {
    id: string;
    question: string;
    description: string;
    image: string;
    volume: number;
    outcomes: string[];
    end_date: string;
    categories?: string[]; // Array of categories (markets can be in multiple)
    currentPrice?: number; // Current YES probability (0-1)
    basePrice?: number; // Legacy field from ingestion, use currentPrice instead
}

export async function getActiveMarkets(): Promise<MarketMetadata[]> {
    noStore(); // Opt out of static caching
    try {
        const data = await redis.get("market:active_list");
        if (!data) return [];

        const markets = JSON.parse(data) as MarketMetadata[];

        // NOTE: basePrice is already stored during ingestion.
        // We removed N Redis calls for order book enrichment here
        // to prevent 50+ round-trips on every page load.
        // Use basePrice as currentPrice if not already set.
        return markets.map(market => ({
            ...market,
            currentPrice: market.currentPrice ?? market.basePrice ?? 0.5
        }));
    } catch (e) {
        console.error("Failed to fetch active markets", e);
        return [];
    }
}

/**
 * Get ALL markets as a flat list — binary markets + event sub-markets combined.
 * Used by the risk engine for category exposure lookups, where we need to find
 * ANY position's market regardless of whether it's a standalone binary or a
 * sub-market inside a multi-outcome event.
 */
export async function getAllMarketsFlat(): Promise<MarketMetadata[]> {
    noStore();
    const allMarkets: MarketMetadata[] = [];
    const seenIds = new Set<string>();

    try {
        // 1. Binary/standalone markets
        const marketData = await redis.get("market:active_list");
        if (marketData) {
            const markets = JSON.parse(marketData) as MarketMetadata[];
            for (const m of markets) {
                if (!seenIds.has(m.id)) {
                    seenIds.add(m.id);
                    allMarkets.push({
                        ...m,
                        currentPrice: m.currentPrice ?? m.basePrice ?? 0.5
                    });
                }
            }
        }

        // 2. Event sub-markets (Polymarket)
        const eventData = await redis.get("event:active_list");
        if (eventData) {
            const events = JSON.parse(eventData) as EventMetadata[];
            for (const event of events) {
                for (const sub of event.markets) {
                    if (!seenIds.has(sub.id)) {
                        seenIds.add(sub.id);
                        allMarkets.push({
                            id: sub.id,
                            question: sub.question,
                            description: event.description || "",
                            image: event.image || "",
                            volume: Math.max(sub.volume || 0, event.volume || 0),
                            outcomes: sub.outcomes || ["Yes", "No"],
                            end_date: event.endDate || "",
                            categories: event.categories,
                            currentPrice: sub.price,
                        });
                    }
                }
            }
        }

        // 3. Kalshi event sub-markets
        const kalshiData = await redis.get("kalshi:active_list");
        if (kalshiData) {
            const events = JSON.parse(kalshiData) as EventMetadata[];
            for (const event of events) {
                for (const sub of event.markets) {
                    if (!seenIds.has(sub.id)) {
                        seenIds.add(sub.id);
                        allMarkets.push({
                            id: sub.id,
                            question: sub.question,
                            description: event.description || "",
                            image: event.image || "",
                            volume: Math.max(sub.volume || 0, event.volume || 0),
                            outcomes: sub.outcomes || ["Yes", "No"],
                            end_date: event.endDate || "",
                            categories: event.categories,
                            currentPrice: sub.price,
                        });
                    }
                }
            }
        }

        return allMarkets;
    } catch (e) {
        console.error("Failed to fetch all markets flat", e);
        return [];
    }
}

/**
 * Get a single market's metadata by ID - O(1) lookup
 * Avoids fetching all markets when only one is needed
 * 
 * Uses event:active_list as source (multi-outcome events contain the markets)
 */
export async function getMarketById(marketId: string): Promise<MarketMetadata | null> {
    noStore();
    try {
        // IMPORTANT: Search event lists FIRST, then binary list.
        // Sub-markets of large events (FIFA World Cup, Bitcoin, Elections) appear in BOTH
        // event:active_list (with parent event volume) and market:active_list (with only
        // sub-market volume). We must search events first so sub-markets inherit the parent
        // event's volume via Math.max — this determines the correct volume tier for trade limits.
        // Bug history: Previously searched market:active_list first, causing FIFA World Cup
        // sub-markets ($5-7M individual volume) to miss their $126M event volume, dropping
        // traders from the 5% tier ($500 cap) to the 2.5% tier ($250 cap).

        // 1. Search event:active_list (Polymarket multi-outcome events)
        const eventData = await redis.get("event:active_list");
        if (eventData) {
            const events = JSON.parse(eventData) as EventMetadata[];
            for (const event of events) {
                const subMarket = event.markets.find(m => m.id === marketId);
                if (subMarket) {
                    // Use max of sub-market and event volume for liquidity assessment
                    // Sub-markets of big events (Bitcoin, Fed) should inherit parent's liquidity
                    const effectiveVolume = Math.max(subMarket.volume || 0, event.volume || 0);
                    return {
                        id: subMarket.id,
                        question: subMarket.question,
                        description: event.description || "",
                        image: event.image || "",
                        volume: effectiveVolume,
                        outcomes: subMarket.outcomes || ["Yes", "No"],
                        end_date: event.endDate || "",
                        categories: event.categories,
                        currentPrice: subMarket.price
                    };
                }
            }
        }

        // 2. Search kalshi:active_list (Kalshi events)
        const kalshiData = await redis.get("kalshi:active_list");
        if (kalshiData) {
            const events = JSON.parse(kalshiData) as EventMetadata[];
            for (const event of events) {
                const subMarket = event.markets.find(m => m.id === marketId);
                if (subMarket) {
                    // Use max of sub-market and event volume for liquidity assessment
                    const effectiveVolume = Math.max(subMarket.volume || 0, event.volume || 0);
                    return {
                        id: subMarket.id,
                        question: subMarket.question,
                        description: event.description || "",
                        image: event.image || "",
                        volume: effectiveVolume,
                        outcomes: subMarket.outcomes || ["Yes", "No"],
                        end_date: event.endDate || "",
                        categories: event.categories,
                        currentPrice: subMarket.price
                    };
                }
            }
        }

        // 3. Fallback: market:active_list (standalone binary markets not in any event)
        const marketData = await redis.get("market:active_list");
        if (marketData) {
            const markets = JSON.parse(marketData) as MarketMetadata[];
            const found = markets.find(m => m.id === marketId);
            if (found) {
                return {
                    ...found,
                    currentPrice: found.currentPrice ?? found.basePrice ?? 0.5
                };
            }
        }

        return null;
    } catch (e) {
        console.error("Failed to fetch market by ID", marketId, e);
        return null;
    }
}

/**
 * Get the parent event ID and sibling market IDs for a given market.
 * Used for per-EVENT exposure limits (not per-market).
 */
export async function getEventInfoForMarket(marketId: string): Promise<{
    eventId: string;
    eventTitle: string;
    siblingMarketIds: string[];
} | null> {
    noStore();
    try {
        // Search event:active_list for multi-outcome markets
        const eventData = await redis.get("event:active_list");
        if (eventData) {
            const events = JSON.parse(eventData) as EventMetadata[];
            for (const event of events) {
                const found = event.markets.find(m => m.id === marketId);
                if (found) {
                    return {
                        eventId: event.id,
                        eventTitle: event.title,
                        siblingMarketIds: event.markets.map(m => m.id)
                    };
                }
            }
        }

        // Try Kalshi events too
        const kalshiData = await redis.get("kalshi:active_list");
        if (kalshiData) {
            const events = JSON.parse(kalshiData) as EventMetadata[];
            for (const event of events) {
                const found = event.markets.find(m => m.id === marketId);
                if (found) {
                    return {
                        eventId: event.id,
                        eventTitle: event.title,
                        siblingMarketIds: event.markets.map(m => m.id)
                    };
                }
            }
        }

        // Not found in any event - market is standalone (its own "event")
        return null;
    } catch (e) {
        console.error("Failed to get event info for market", marketId, e);
        return null;
    }
}


// --- Event Types (Multi-Outcome Markets like Elections) ---

export interface SubMarket {
    id: string;
    question: string;
    outcomes: string[];
    price: number;
    volume: number;
    groupItemTitle?: string;
}

export interface EventMetadata {
    id: string;
    title: string;
    slug: string;
    description?: string;
    image?: string;
    volume: number;
    endDate?: string;
    // New fields for Kalshi modal parity
    rules?: string;
    openTime?: string;
    closeTime?: string;
    settlementTime?: string;
    categories?: string[];
    markets: SubMarket[];
    isMultiOutcome: boolean;
}

export type Platform = "polymarket" | "kalshi";

export async function getActiveEvents(platform: Platform = "polymarket"): Promise<EventMetadata[]> {
    noStore();
    try {
        // Fetch from platform-specific Redis key
        const redisKey = platform === "kalshi" ? "kalshi:active_list" : "event:active_list";
        const data = await redis.get(redisKey);

        let events: EventMetadata[] = [];
        if (data) {
            events = JSON.parse(data) as EventMetadata[];
        }

        const now = new Date();

        // Filter out expired events (end date in the past)
        const activeEvents = events.filter(event => {
            // If no end date, assume it's still active
            if (!event.endDate) return true;

            try {
                const endDate = new Date(event.endDate);
                // Keep events that haven't ended yet
                // Add 1 hour buffer for settlement time
                return endDate.getTime() + (60 * 60 * 1000) > now.getTime();
            } catch {
                // If date parsing fails, keep the event
                return true;
            }
        });

        // Also filter individual markets within events that may have expired
        let filteredEvents = activeEvents.map(event => {
            if (!event.markets || event.markets.length === 0) return event;

            // Filter out sub-markets with names indicating past dates
            const filteredMarkets = event.markets.filter(market => {
                const q = market.question.toLowerCase();

                // Check for date range patterns like "January 5-11" or "January 5-11?"
                const rangePattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})-(\d{1,2})/i;
                const rangeMatch = q.match(rangePattern);
                if (rangeMatch) {
                    const month = rangeMatch[1];
                    const endDay = parseInt(rangeMatch[3], 10); // Use end of range
                    const currentYear = now.getFullYear();
                    const parsedDate = new Date(`${month} ${endDay} ${currentYear}`);

                    if (!isNaN(parsedDate.getTime())) {
                        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        if (parsedDate < oneDayAgo) {
                            return false; // Filter out this market
                        }
                    }
                }

                // Check for single date patterns like "January 12" or "January 12?"
                const singleDatePattern = /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:\?|$|\s)/i;
                const singleMatch = q.match(singleDatePattern);
                if (singleMatch && !rangeMatch) { // Only check if not already a range
                    const month = singleMatch[1];
                    const day = parseInt(singleMatch[2], 10);
                    const currentYear = now.getFullYear();
                    const parsedDate = new Date(`${month} ${day} ${currentYear}`);

                    // If parsing worked and date is in the past (with 1 day buffer)
                    if (!isNaN(parsedDate.getTime())) {
                        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        if (parsedDate < oneDayAgo) {
                            return false; // Filter out this market
                        }
                    }
                }

                // DEFENSIVE FILTER 1: Skip markets with invalid prices (≤0.01 or ≥0.99)
                // These indicate resolved, stale, or otherwise untradable markets
                const price = market.price ?? 0;
                if (price <= 0.01 || price >= 0.99) {
                    return false;
                }

                // DEFENSIVE FILTER 2: Skip markets with exactly 50% price (±0.5%) AND low volume
                // 50% + low volume = placeholder with no real trading
                // 50% + high volume = legitimate contentious market, let it through
                const isFiftyPercent = Math.abs(price - 0.5) < 0.005;
                const isLowVolume = (market.volume || 0) < 50000; // Under $50k
                if (isFiftyPercent && isLowVolume) {
                    return false;
                }

                return true; // Keep the market
            });

            // Only return event if it still has markets
            return {
                ...event,
                markets: filteredMarkets
            };
        }).filter(event => event.markets.length > 0);

        // --- ENHANCEMENT: Merge high-volume binary markets (especially Sports) ---
        // This ensures individual game markets appear in the Sports tab
        if (platform === "polymarket") {
            try {
                const binaryData = await redis.get("market:active_list");
                if (binaryData) {
                    const binaryMarkets = JSON.parse(binaryData) as MarketMetadata[];

                    // Get existing event titles for deduplication (case-insensitive)
                    const existingTitles = new Set(
                        filteredEvents.map(e => e.title.toLowerCase().trim())
                    );

                    // Also collect ALL sub-market questions and IDs from featured events.
                    // This prevents individual binary markets (e.g. "Will Josh Shapiro win...")
                    // from appearing as separate cards when they're already sub-markets
                    // within a grouped event (e.g. "Democratic Presidential Nominee 2028").
                    const existingSubMarketQuestions = new Set<string>();
                    const existingSubMarketIds = new Set<string>();
                    for (const event of filteredEvents) {
                        for (const market of event.markets) {
                            existingSubMarketQuestions.add(market.question.toLowerCase().trim());
                            existingSubMarketIds.add(market.id);
                        }
                    }

                    // Convert binary markets to EventMetadata format
                    // Focus on Sports and other high-volume markets not already in featured events
                    const convertedEvents: EventMetadata[] = binaryMarkets
                        .filter(m => {
                            // Skip if title matches an existing event title
                            if (existingTitles.has(m.question.toLowerCase().trim())) return false;
                            // Skip if this market's question matches a sub-market in a featured event
                            // (e.g. "Will Josh Shapiro win..." already inside "Dem Nominee 2028")
                            if (existingSubMarketQuestions.has(m.question.toLowerCase().trim())) return false;
                            // Skip if same token ID already exists in a featured event
                            if (existingSubMarketIds.has(m.id)) return false;
                            // Keep if has categories (especially Sports)
                            if (!m.categories || m.categories.length === 0) return false;

                            // DEFENSIVE FILTER 1: Skip invalid prices (≤0.01 or ≥0.99)
                            // These indicate resolved, stale, or otherwise untradable markets
                            const price = m.currentPrice ?? m.basePrice ?? 0.5;
                            if (price <= 0.01 || price >= 0.99) return false;

                            // DEFENSIVE FILTER 2: Skip 50% price + low volume (placeholder data)
                            // High-volume 50% markets are legitimate and get through
                            const isFiftyPercent = Math.abs(price - 0.5) < 0.005;
                            const isLowVolume = (m.volume || 0) < 50000;
                            if (isFiftyPercent && isLowVolume) return false;

                            return true;
                        })
                        .map(m => {
                            // Use basePrice (what ingestion writes) with proper fallback chain
                            const price = m.currentPrice ?? m.basePrice ?? 0.5;
                            return {
                                id: m.id,
                                title: m.question,
                                slug: m.id,
                                description: m.description || "",
                                image: m.image || "",
                                volume: m.volume || 0,
                                endDate: m.end_date,
                                categories: m.categories || [],
                                markets: [{
                                    id: m.id,
                                    question: m.question,
                                    outcomes: m.outcomes || ["Yes", "No"],
                                    price: price,
                                    volume: m.volume || 0,
                                }],
                                isMultiOutcome: false,
                            };
                        });

                    // Merge: Featured events first, then converted binary markets
                    filteredEvents = [...filteredEvents, ...convertedEvents];

                    console.log(`[getActiveEvents] Merged ${convertedEvents.length} binary markets (skipped ${binaryMarkets.length - convertedEvents.length - existingTitles.size} 50% placeholders)`);
                }
            } catch (err) {
                // Silent fail - don't break if binary markets aren't available
                console.error("[getActiveEvents] Failed to merge binary markets:", err);
            }
        }

        console.log(`[getActiveEvents] Returning ${filteredEvents.length} total events`);

        // PARITY FIX: Overlay live WebSocket prices onto all market cards.
        // Without this, cards show ingestion-time prices (could be hours stale).
        // The WS price stream writes to market:prices:all every 5 seconds.
        try {
            const livePriceData = await redis.get("market:prices:all");
            if (livePriceData) {
                const livePrices = JSON.parse(livePriceData) as Record<string, { price?: string }>;
                let updatedCount = 0;
                const removedMarketIds: string[] = [];

                for (const event of filteredEvents) {
                    for (const market of event.markets) {
                        const liveEntry = livePrices[market.id];
                        if (liveEntry?.price) {
                            const livePrice = parseFloat(liveEntry.price);
                            if (livePrice > 0.01 && livePrice < 0.99) {
                                // Tradable range — update price
                                market.price = livePrice;
                                updatedCount++;
                            } else {
                                // LAYER 1: Market has reached resolution territory.
                                // Mark for removal instead of silently keeping stale price.
                                // This prevents the confusing state where the card shows 68¢
                                // but the orderbook is actually at 99¢.
                                removedMarketIds.push(market.id);
                            }
                        }
                    }
                }

                // Remove resolved sub-markets and events with no tradable markets left
                if (removedMarketIds.length > 0) {
                    filteredEvents = filteredEvents
                        .map(event => ({
                            ...event,
                            markets: event.markets.filter(m => !removedMarketIds.includes(m.id))
                        }))
                        .filter(event => event.markets.length > 0);
                    console.log(`[getActiveEvents] Removed ${removedMarketIds.length} resolved sub-markets via live price overlay`);
                }

                if (updatedCount > 0) {
                    console.log(`[getActiveEvents] Overlaid ${updatedCount} live WS prices onto market cards`);
                }
            }
        } catch (err) {
            // Non-fatal: if live prices unavailable, cards still show ingestion prices
            console.error("[getActiveEvents] Failed to overlay live prices:", err);
        }

        return filteredEvents;
    } catch (e) {
        console.error(`Failed to fetch active events for ${platform}`, e);
        return [];
    }
}

