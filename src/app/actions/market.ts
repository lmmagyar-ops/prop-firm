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

        // Fetch prices for each market from order book cache
        const marketsWithPrices = await Promise.all(
            markets.map(async (market) => {
                const extendedMarket = market as MarketMetadata & { basePrice?: number };
                try {
                    const bookData = await redis.get(`market:book:${market.id}`);
                    if (bookData) {
                        const book = JSON.parse(bookData);
                        const price = extractPriceFromBook(book);
                        if (price !== null) {
                            return { ...market, currentPrice: price };
                        }
                    }
                } catch {
                    // Silent fail - use fallback price
                }
                // Use basePrice from Polymarket API as fallback
                return { ...market, currentPrice: extendedMarket.basePrice || 0.5 };
            })
        );

        return marketsWithPrices;
    } catch (e) {
        console.error("Failed to fetch active markets", e);
        return [];
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
    categories?: string[];
    markets: SubMarket[];
    isMultiOutcome: boolean;
}

export async function getActiveEvents(): Promise<EventMetadata[]> {
    noStore();
    try {
        const data = await redis.get("event:active_list");
        if (!data) return [];

        const events = JSON.parse(data) as EventMetadata[];

        // Enrich sub-markets with current prices from order book
        const enrichedEvents = await Promise.all(
            events.map(async (event) => {
                const enrichedMarkets = await Promise.all(
                    event.markets.map(async (market) => {
                        try {
                            const bookData = await redis.get(`market:book:${market.id}`);
                            if (bookData) {
                                const book = JSON.parse(bookData);
                                const price = extractPriceFromBook(book);
                                if (price !== null) {
                                    return { ...market, price };
                                }
                            }
                        } catch { }
                        return market;
                    })
                );
                // Re-sort by price after enrichment
                enrichedMarkets.sort((a, b) => b.price - a.price);
                return { ...event, markets: enrichedMarkets };
            })
        );

        return enrichedEvents;
    } catch (e) {
        console.error("Failed to fetch active events", e);
        return [];
    }
}
