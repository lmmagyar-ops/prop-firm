/**
 * PolymarketOracle
 * 
 * Official market resolution detection via Polymarket Gamma API.
 * Replaces the price-move heuristic with authoritative source of truth.
 * 
 * Use Cases:
 * - Exclude P&L from resolved markets in funded account payouts
 * - Detect closed markets before trade execution
 * - Sync resolution status for position settlement
 */

import { kvGet, kvSet, kvDel } from "./worker-client";
import { getErrorMessage } from "./errors";
import { createLogger } from "@/lib/logger";
const logger = createLogger("PolymarketOracle");

const GAMMA_API_BASE = "https://gamma-api.polymarket.com";
const CACHE_TTL_SECONDS = 300; // 5 minute cache for resolution status

export interface MarketResolution {
    marketId: string;
    isResolved: boolean;
    isClosed: boolean;
    winningOutcome?: string;  // "Yes", "No", or outcome name
    resolutionPrice?: number; // 0 or 1 for binary
    source: 'api' | 'cache' | 'fallback';
    checkedAt: Date;
}

export interface GammaMarketResponse {
    id?: string;
    question?: string;
    closed?: boolean;
    archived?: boolean;
    accepting_orders?: boolean;
    outcomePrices?: string;   // JSON array: ["0.95", "0.05"]
    outcomes?: string;         // JSON array: ["Yes", "No"]
    uma_resolution_status?: string; // "resolved", "pending", etc.
    resolved?: boolean;
    winning_outcome?: string;
}

export class PolymarketOracle {

    /**
     * Check if a market is officially resolved via Polymarket API.
     * This is the authoritative source - replaces price-move heuristics.
     * 
     * @param tokenId The CLOB token ID (asset_id)
     */
    static async getResolutionStatus(tokenId: string): Promise<MarketResolution> {
        const cacheKey = `oracle:resolution:${tokenId}`;

        try {
            // 1. Check cache first (via worker HTTP)
            const cached = await kvGet(cacheKey);
            if (cached) {
                const parsed = JSON.parse(cached) as MarketResolution;
                return { ...parsed, source: 'cache' };
            }

            // 2. Query Gamma API for market by token ID
            const marketData = await this.fetchMarketByTokenId(tokenId);

            if (!marketData) {
                // Market not found - treat as potentially resolved (defensive)
                return this.buildFallback(tokenId, 'Market not found in Gamma API');
            }

            // 3. Determine resolution status
            const resolution = this.parseResolution(tokenId, marketData);

            // 4. Cache the result (via worker HTTP)
            await kvSet(cacheKey, JSON.stringify(resolution), CACHE_TTL_SECONDS);

            return resolution;

        } catch (error: unknown) {
            logger.error(`[PolymarketOracle] Error fetching resolution for ${tokenId.slice(0, 12)}:`, getErrorMessage(error));
            return this.buildFallback(tokenId, getErrorMessage(error));
        }
    }

    /**
     * Batch check resolution status for multiple markets.
     * More efficient than individual calls.
     */
    static async batchGetResolutionStatus(tokenIds: string[]): Promise<Map<string, MarketResolution>> {
        const results = new Map<string, MarketResolution>();

        // Process in parallel with concurrency limit
        const BATCH_SIZE = 10;
        for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
            const batch = tokenIds.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map(id => this.getResolutionStatus(id))
            );
            batch.forEach((id, idx) => results.set(id, batchResults[idx]));
        }

        return results;
    }

    /**
     * Check if a market is tradeable (not closed/resolved).
     * Quick check for trade validation.
     */
    static async isTradeable(tokenId: string): Promise<boolean> {
        const resolution = await this.getResolutionStatus(tokenId);
        return !resolution.isResolved && !resolution.isClosed;
    }

    /**
     * Fetch market data from Gamma API using token ID.
     * Token IDs are used in the CLOB, but Gamma API uses market slugs/IDs.
     * We search for the market containing this token.
     */
    private static async fetchMarketByTokenId(tokenId: string): Promise<GammaMarketResponse | null> {
        try {
            // Gamma API allows searching by clobTokenIds
            const url = `${GAMMA_API_BASE}/markets?clob_token_ids=${tokenId}`;
            const response = await fetch(url, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });

            if (!response.ok) {
                logger.warn(`[PolymarketOracle] Gamma API returned ${response.status}`);
                return null;
            }

            const markets = await response.json();

            // API returns array of markets matching the token
            if (Array.isArray(markets) && markets.length > 0) {
                return markets[0] as GammaMarketResponse;
            }

            return null;
        } catch (error: unknown) {
            logger.error(`[PolymarketOracle] Fetch error:`, getErrorMessage(error));
            return null;
        }
    }

    /**
     * Parse resolution status from Gamma API response.
     */
    private static parseResolution(tokenId: string, market: GammaMarketResponse): MarketResolution {
        const isClosed = market.closed === true || market.archived === true;
        const notAcceptingOrders = market.accepting_orders === false;

        // Check UMA resolution status if available
        const umaResolved = market.uma_resolution_status === 'resolved';

        // Check if prices indicate resolution (0 or 1)
        let priceIndicatesResolution = false;
        let resolutionPrice: number | undefined;
        let winningOutcome: string | undefined;

        if (market.outcomePrices && market.outcomes) {
            try {
                const prices = JSON.parse(market.outcomePrices) as string[];
                const outcomes = JSON.parse(market.outcomes) as string[];

                // Resolution = one outcome at ~1, other at ~0
                // FAIL CLOSED: skip if prices are missing — never fabricate 50¢
                const yesRaw = prices[0];
                const noRaw = prices[1];
                if (yesRaw && noRaw) {
                    const yesPrice = parseFloat(yesRaw);
                    const noPrice = parseFloat(noRaw);

                    if (!isNaN(yesPrice) && yesPrice >= 0.95) {
                        priceIndicatesResolution = true;
                        resolutionPrice = 1;
                        winningOutcome = outcomes[0] || "Yes";
                    } else if (!isNaN(noPrice) && noPrice >= 0.95) {
                        priceIndicatesResolution = true;
                        resolutionPrice = 0;
                        winningOutcome = outcomes[1] || "No";
                    }
                }
            } catch {
                // Invalid JSON, ignore
            }
        }

        // Market is resolved if ANY of these are true:
        // 1. Explicitly closed in API
        // 2. UMA oracle has resolved it
        // 3. Not accepting orders AND prices indicate resolution
        const isResolved = isClosed || umaResolved || (notAcceptingOrders && priceIndicatesResolution);

        return {
            marketId: tokenId,
            isResolved,
            isClosed,
            winningOutcome,
            resolutionPrice,
            source: 'api',
            checkedAt: new Date()
        };
    }

    /**
     * Build fallback response when API is unavailable.
     * Conservative: assumes NOT resolved to avoid blocking trades incorrectly.
     */
    private static buildFallback(tokenId: string, reason: string): MarketResolution {
        logger.warn(`[PolymarketOracle] Using fallback for ${tokenId.slice(0, 12)}: ${reason}`);
        return {
            marketId: tokenId,
            isResolved: false, // Conservative: don't block trades
            isClosed: false,
            source: 'fallback',
            checkedAt: new Date()
        };
    }

    /**
     * Clear resolution cache for a specific market.
     * Useful after detecting a resolution event.
     */
    static async invalidateCache(tokenId: string): Promise<void> {
        await kvDel(`oracle:resolution:${tokenId}`);
    }
}
