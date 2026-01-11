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
        if (!data) return [];

        const events = JSON.parse(data) as EventMetadata[];

        // NOTE: Prices are already stored in the event data from ingestion.
        // We removed the N*M Redis calls for order book enrichment here
        // to prevent >100 round-trips on every page load.
        // Live prices are fetched on-demand in the trading widget.

        return events;
    } catch (e) {
        console.error(`Failed to fetch active events for ${platform}`, e);
        return [];
    }
}
