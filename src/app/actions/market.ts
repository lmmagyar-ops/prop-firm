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
