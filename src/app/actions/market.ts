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
    category?: string; // "Crypto", "Politics", "Sports", etc.
}

export async function getActiveMarkets(): Promise<MarketMetadata[]> {
    noStore(); // Opt out of static caching
    try {
        const data = await redis.get("market:active_list");
        if (!data) return [];
        return JSON.parse(data) as MarketMetadata[];
    } catch (e) {
        console.error("Failed to fetch active markets", e);
        return [];
    }
}
