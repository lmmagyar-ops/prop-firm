/**
 * Market Cache Service
 * 
 * Postgres-based fallback cache for market data during Railway outages.
 * Stores a single snapshot (singleton row) that is updated on every
 * successful worker fetch (write-through) and read when the worker
 * is unreachable (fallback).
 * 
 * Hard-expires after 1 hour — extremely stale data shouldn't be shown.
 */

import { db } from "@/db";
import { marketCache } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "./logger";

const logger = createLogger('MarketCacheService');

const MAX_CACHE_AGE_MS = 60 * 60 * 1000; // 1 hour hard limit

export class MarketCacheService {
    /**
     * Save a market data snapshot to Postgres.
     * Called on every successful worker fetch (write-through).
     * Uses upsert to maintain the singleton row.
     */
    static async saveSnapshot(marketsData: unknown, pricesData?: unknown): Promise<void> {
        try {
            await db.insert(marketCache)
                .values({
                    id: 'current',
                    marketsJson: marketsData,
                    pricesJson: pricesData ?? null,
                    capturedAt: new Date(),
                    workerHealthy: true,
                })
                .onConflictDoUpdate({
                    target: marketCache.id,
                    set: {
                        marketsJson: marketsData,
                        pricesJson: pricesData ?? null,
                        capturedAt: new Date(),
                        workerHealthy: true,
                    },
                });
        } catch (error) {
            // Non-blocking — don't let cache writes break the happy path
            logger.error('Failed to save market cache', error instanceof Error ? error : null);
        }
    }

    /**
     * Get the cached market data snapshot from Postgres.
     * Returns null if no cache exists or if the cache is too old (>1 hour).
     */
    static async getSnapshot(): Promise<{ markets: unknown; prices: unknown; capturedAt: Date; ageMs: number } | null> {
        try {
            const row = await db.query.marketCache.findFirst({
                where: eq(marketCache.id, 'current'),
            });

            if (!row || !row.capturedAt) return null;

            const ageMs = Date.now() - row.capturedAt.getTime();

            // Hard expiry: don't show data older than 1 hour
            if (ageMs > MAX_CACHE_AGE_MS) {
                logger.warn('Market cache too old, refusing to serve', {
                    ageMin: Math.round(ageMs / 60000),
                });
                return null;
            }

            return {
                markets: row.marketsJson,
                prices: row.pricesJson,
                capturedAt: row.capturedAt,
                ageMs,
            };
        } catch (error) {
            logger.error('Failed to read market cache', error instanceof Error ? error : null);
            return null;
        }
    }

    /**
     * Get the age of the cached data in seconds.
     * Returns null if no cache exists.
     */
    static async getCacheAge(): Promise<number | null> {
        try {
            const row = await db.query.marketCache.findFirst({
                where: eq(marketCache.id, 'current'),
            });

            if (!row || !row.capturedAt) return null;
            return Math.round((Date.now() - row.capturedAt.getTime()) / 1000);
        } catch {
            return null;
        }
    }
}
