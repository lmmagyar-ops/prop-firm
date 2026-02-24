/**
 * Market Integrity Module
 * 
 * Runtime guards for market data quality:
 * 1. Prune resolved markets from Redis (prices ≥0.95 or ≤0.05)
 * 2. Check price drift against live Polymarket API
 * 
 * Runs inside the ingestion worker on scheduled intervals.
 */

import type Redis from 'ioredis';
import { createLogger } from '../lib/logger';
import { db } from '@/db';
import { positions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
const logger = createLogger('MarketIntegrity');

// ============================================================================
// Types (mirrored from ingestion.ts)
// ============================================================================

interface SubMarket {
    id: string;
    question: string;
    outcomes: string[];
    price: number;
    volume: number;
}

interface StoredEvent {
    id: string;
    title: string;
    slug: string;
    description?: string;
    image?: string;
    volume: number;
    volume24hr?: number;
    createdAt?: string;
    categories?: string[];
    markets: SubMarket[];
    isMultiOutcome: boolean;
}

interface StoredBinaryMarket {
    id: string;
    question: string;
    description?: string;
    image?: string;
    volume: number;
    outcomes: string[];
    end_date?: string;
    categories: string[];
    basePrice: number;
    closed?: boolean;
    accepting_orders?: boolean;
}

interface DriftResult {
    marketId: string;
    title: string;
    cachedPrice: number;
    livePrice: number;
    deviation: number;
}

// ============================================================================
// Configuration
// ============================================================================

const RESOLVED_THRESHOLD_HIGH = 0.95;  // YES ≥ 95% → effectively resolved
const RESOLVED_THRESHOLD_LOW = 0.05;   // YES ≤ 5% → effectively resolved
const DRIFT_THRESHOLD = 0.05;          // 5% deviation triggers alert
const DRIFT_SAMPLE_SIZE = 20;          // Number of markets to spot-check
const POLYMARKET_API = 'https://gamma-api.polymarket.com/markets';

// ============================================================================
// 1. Resolved Market Pruning
// ============================================================================

/**
 * Remove markets from Redis that have effectively resolved
 * (price ≥0.95 or ≤0.05). These can slip through between fetch cycles
 * when WebSocket price updates push them into resolved territory.
 */
export async function pruneResolvedMarkets(redis: Redis): Promise<{ prunedEvents: number; prunedBinary: number }> {
    const prunedEvents = 0;
    let prunedBinary = 0;

    try {
        // --- event:active_list ---
        // NOTE: Sub-markets in multi-outcome events are NOT pruned by price.
        // "Price at 99%" ≠ "market settled" — Polymarket shows all outcomes
        // as tradeable until the market actually closes via API (closed=true).
        // Example: "Solana above 30" at 99% is still an active, tradeable outcome.
        // We only prune sub-markets that Polymarket has explicitly closed (market.closed=true),
        // which is enforced during ingestion (fetchFeaturedEvents skips closed markets).
        // No further pruning needed here for event sub-markets.

        // --- Prune market:active_list (standalone binary markets only) ---
        // Binary markets CAN be pruned at extreme prices because they are independent
        // yes/no bets — a 99% price effectively means no liquidity on the losing side.
        // But we still guard against pruning markets with open positions.
        const marketData = await redis.get('market:active_list');
        if (marketData) {
            const markets: StoredBinaryMarket[] = JSON.parse(marketData);
            const filtered: StoredBinaryMarket[] = [];

            for (const m of markets) {
                const isResolved = m.basePrice >= RESOLVED_THRESHOLD_HIGH || m.basePrice <= RESOLVED_THRESHOLD_LOW;
                if (isResolved) {
                    // GUARD: Never prune a market that has open positions
                    const openCount = await db
                        .select({ count: sql<number>`count(*)::int` })
                        .from(positions)
                        .where(and(
                            eq(positions.marketId, m.id),
                            eq(positions.status, 'OPEN')
                        ));
                    if (openCount[0].count > 0) {
                        logger.info(`[Integrity] Skipping prune of binary "${m.question}" — ${openCount[0].count} open position(s)`);
                        filtered.push(m);
                        continue;
                    }
                    logger.info(`[Integrity] Pruning resolved binary market: "${m.question}" (price: ${m.basePrice.toFixed(2)})`);
                    prunedBinary++;
                } else {
                    filtered.push(m);
                }
            }

            if (prunedBinary > 0) {
                const ttl = await redis.ttl('market:active_list');
                await redis.set('market:active_list', JSON.stringify(filtered), 'EX', Math.max(ttl, 60));
            }
        }

    } catch (err) {
        logger.error('[Integrity] Error pruning resolved markets:', err);
    }

    if (prunedEvents > 0 || prunedBinary > 0) {
        logger.info(`[Integrity] Pruned ${prunedEvents} event sub-markets + ${prunedBinary} binary markets`);
    }

    return { prunedEvents, prunedBinary };
}

// ============================================================================
// 2. Price Drift Detection
// ============================================================================

/**
 * Sample markets from Redis and compare against live Polymarket API prices.
 * Flags deviations > DRIFT_THRESHOLD (5%).
 */
export async function checkPriceDrift(redis: Redis): Promise<DriftResult[]> {
    const drifts: DriftResult[] = [];

    try {
        // Collect cached markets to sample
        const cachedMarkets: { id: string; title: string; price: number }[] = [];

        const eventData = await redis.get('event:active_list');
        if (eventData) {
            const events: StoredEvent[] = JSON.parse(eventData);
            for (const event of events) {
                for (const m of event.markets) {
                    cachedMarkets.push({ id: m.id, title: m.question, price: m.price });
                }
            }
        }

        const marketData = await redis.get('market:active_list');
        if (marketData) {
            const markets: StoredBinaryMarket[] = JSON.parse(marketData);
            for (const m of markets) {
                cachedMarkets.push({ id: m.id, title: m.question, price: m.basePrice });
            }
        }

        if (cachedMarkets.length === 0) {
            logger.info('[Integrity] No cached markets to check for drift');
            return drifts;
        }

        // Random sample to avoid hitting API limits
        const sample = cachedMarkets
            .sort(() => Math.random() - 0.5)
            .slice(0, DRIFT_SAMPLE_SIZE);

        // Fetch live prices for sampled token IDs
        const tokenIds = sample.map(m => m.id);
        const livePrices = await fetchLivePrices(tokenIds);

        // Compare
        for (const cached of sample) {
            const livePrice = livePrices.get(cached.id);
            if (livePrice === undefined) continue; // Market may no longer be on API

            const deviation = Math.abs(cached.price - livePrice);
            if (deviation > DRIFT_THRESHOLD) {
                logger.warn(`[Integrity] ⚠️ Price drift: "${cached.title}" cached=${cached.price.toFixed(3)} live=${livePrice.toFixed(3)} (${(deviation * 100).toFixed(1)}%)`);
                drifts.push({
                    marketId: cached.id,
                    title: cached.title,
                    cachedPrice: cached.price,
                    livePrice,
                    deviation,
                });
            }
        }

        logger.info(`[Integrity] Price drift check: ${sample.length} sampled, ${drifts.length} deviations >5%`);

    } catch (err) {
        logger.error('[Integrity] Error checking price drift:', err);
    }

    return drifts;
}

/**
 * Fetch live YES token prices from Polymarket's Gamma API for specific token IDs.
 */
async function fetchLivePrices(tokenIds: string[]): Promise<Map<string, number>> {
    const prices = new Map<string, number>();

    try {
        // Gamma API doesn't support filtering by token ID directly,
        // so we fetch a broad set and match against our sample.
        const response = await fetch(`${POLYMARKET_API}?limit=200&active=true&closed=false`);
        if (!response.ok) {
            logger.error(`[Integrity] Gamma API error: ${response.status}`);
            return prices;
        }

        const markets = await response.json();
        const tokenIdSet = new Set(tokenIds);

        for (const market of markets) {
            if (!market.clobTokenIds) continue;
            try {
                const clobTokens = JSON.parse(market.clobTokenIds);
                const outcomePrices = JSON.parse(market.outcomePrices || '[]');

                for (let i = 0; i < clobTokens.length; i++) {
                    if (tokenIdSet.has(clobTokens[i]) && outcomePrices[i]) {
                        prices.set(clobTokens[i], parseFloat(outcomePrices[i]));
                    }
                }
            } catch {
                // Skip malformed market
            }
        }
    } catch (err) {
        logger.error('[Integrity] Failed to fetch live prices:', err);
    }

    return prices;
}
