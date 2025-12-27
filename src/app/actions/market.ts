"use server";

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6380";
const redis = new Redis(REDIS_URL);

export interface MarketMetadata {
    id: string;
    question: string;
    description: string;
    image: string;
    volume: number;
    outcomes: string[];
    end_date: string;
    category?: string; // "Crypto", "Politics", "Sports", etc.
}

export async function getActiveMarkets(): Promise<MarketMetadata[]> {
    try {
        const data = await redis.get("market:active_list");
        if (!data) return [];
        return JSON.parse(data) as MarketMetadata[];
    } catch (e) {
        console.error("Failed to fetch active markets", e);
        return [];
    }
}
