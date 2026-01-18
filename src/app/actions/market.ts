"use server";

import Redis from "ioredis";

import { unstable_noStore as noStore } from "next/cache";

const getRedisConfig = () => {
    if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
        return {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD,
            tls: {} // Required for Upstash
        };
    }
    return process.env.REDIS_URL || "redis://localhost:6380";
};

const redis = new Redis(getRedisConfig() as any);

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
}

/**
 * Extract current price from order book data
 * Uses best bid as the current price (most someone is willing to pay for YES)
 */
function extractPriceFromBook(bookData: any): number | null {
    try {
        if (bookData?.bids && bookData.bids.length > 0) {
            // Best bid is highest price someone will pay = current YES probability
            const bids = bookData.bids.sort((a: any, b: any) =>
                parseFloat(b.price) - parseFloat(a.price)
            );
            return parseFloat(bids[0].price);
        }
        return null;
    } catch {
        return null;
    }
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
            currentPrice: market.currentPrice ?? (market as any).basePrice ?? 0.5
        }));
    } catch (e) {
        console.error("Failed to fetch active markets", e);
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
        // First try market:active_list (legacy binary markets)
        const marketData = await redis.get("market:active_list");
        if (marketData) {
            const markets = JSON.parse(marketData) as MarketMetadata[];
            const found = markets.find(m => m.id === marketId);
            if (found) {
                return {
                    ...found,
                    currentPrice: found.currentPrice ?? (found as any).basePrice ?? 0.5
                };
            }
        }

        // Fallback: Search event:active_list for multi-outcome markets
        const eventData = await redis.get("event:active_list");
        if (eventData) {
            const events = JSON.parse(eventData) as EventMetadata[];
            for (const event of events) {
                const subMarket = event.markets.find(m => m.id === marketId);
                if (subMarket) {
                    return {
                        id: subMarket.id,
                        question: subMarket.question,
                        description: event.description || "",
                        image: event.image || "",
                        volume: subMarket.volume || event.volume,
                        outcomes: subMarket.outcomes || ["Yes", "No"],
                        end_date: event.endDate || "",
                        categories: event.categories,
                        currentPrice: subMarket.price
                    };
                }
            }
        }

        // Try Kalshi events too
        const kalshiData = await redis.get("kalshi:active_list");
        if (kalshiData) {
            const events = JSON.parse(kalshiData) as EventMetadata[];
            for (const event of events) {
                const subMarket = event.markets.find(m => m.id === marketId);
                if (subMarket) {
                    return {
                        id: subMarket.id,
                        question: subMarket.question,
                        description: event.description || "",
                        image: event.image || "",
                        volume: subMarket.volume || event.volume,
                        outcomes: subMarket.outcomes || ["Yes", "No"],
                        end_date: event.endDate || "",
                        categories: event.categories,
                        currentPrice: subMarket.price
                    };
                }
            }
        }

        return null;
    } catch (e) {
        console.error("Failed to fetch market by ID", marketId, e);
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

                // DEFENSIVE FILTER: Skip markets with exactly 50% price (±0.5%) AND low volume
                // 50% + low volume = placeholder with no real trading
                // 50% + high volume = legitimate contentious market, let it through
                const isFiftyPercent = Math.abs(market.price - 0.5) < 0.005;
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

                    // Convert binary markets to EventMetadata format
                    // Focus on Sports and other high-volume markets not already in featured events
                    const convertedEvents: EventMetadata[] = binaryMarkets
                        .filter(m => {
                            // Skip if already in featured events
                            if (existingTitles.has(m.question.toLowerCase().trim())) return false;
                            // Keep if has categories (especially Sports)
                            if (!m.categories || m.categories.length === 0) return false;

                            // DEFENSIVE FILTER: Skip 50% price + low volume (placeholder data)
                            // High-volume 50% markets are legitimate and get through
                            const price = m.currentPrice ?? (m as any).basePrice ?? 0.5;
                            const isFiftyPercent = Math.abs(price - 0.5) < 0.005;
                            const isLowVolume = (m.volume || 0) < 50000;
                            if (isFiftyPercent && isLowVolume) return false;

                            return true;
                        })
                        .map(m => {
                            // Use basePrice (what ingestion writes) with proper fallback chain
                            const price = m.currentPrice ?? (m as any).basePrice ?? 0.5;
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

        return filteredEvents;
    } catch (e) {
        console.error(`Failed to fetch active events for ${platform}`, e);
        return [];
    }
}

