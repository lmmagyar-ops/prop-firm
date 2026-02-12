/**
 * Resolution Detector
 * 
 * Detects market resolution events via Polymarket Oracle API.
 * Used to exclude P&L from resolution events in funded account payouts.
 * 
 * This ensures fairness:
 * - Traders aren't rewarded for lucky gambling on binary outcomes
 * - Traders aren't punished for unlucky resolution losses
 * 
 * v2.0: Now uses PolymarketOracle for authoritative resolution status
 *       instead of price-move heuristics.
 */

import { db } from "@/db";
import { positions, trades } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { PolymarketOracle } from "./polymarket-oracle";
import { RESOLUTION_CONFIG } from "./funded-rules";
import { createLogger } from "@/lib/logger";
const logger = createLogger("ResolutionDetector");

export interface ResolutionEvent {
    marketId: string;
    priceChange: number;
    isResolution: boolean;
    detectedAt: Date;
    source?: 'oracle' | 'heuristic';
    winningOutcome?: string;
}

export interface ExcludedPnLResult {
    totalExcluded: number;
    excludedPositions: Array<{
        positionId: string;
        marketId: string;
        pnl: number;
        reason: string;
    }>;
}

export class ResolutionDetector {

    /**
     * Check if a market has been officially resolved.
     * Uses PolymarketOracle for authoritative status from Gamma API.
     * Falls back to price-move heuristic if Oracle unavailable.
     */
    static async isResolutionEvent(marketId: string): Promise<ResolutionEvent> {
        try {
            // Primary: Use PolymarketOracle for authoritative status
            const oracleStatus = await PolymarketOracle.getResolutionStatus(marketId);

            if (oracleStatus.source !== 'fallback') {
                // Oracle returned authoritative data
                return {
                    marketId,
                    priceChange: oracleStatus.resolutionPrice !== undefined
                        ? Math.abs(oracleStatus.resolutionPrice - 0.5) * 2
                        : 0,
                    isResolution: oracleStatus.isResolved,
                    detectedAt: oracleStatus.checkedAt,
                    source: 'oracle',
                    winningOutcome: oracleStatus.winningOutcome
                };
            }

            // Fallback: Use legacy price-move heuristic
            logger.info(`[ResolutionDetector] Oracle unavailable for ${marketId.slice(0, 12)}, using heuristic`);
            return this.legacyPriceHeuristic(marketId);

        } catch (error) {
            logger.error(`[ResolutionDetector] Error checking market ${marketId}:`, error);
            return { marketId, priceChange: 0, isResolution: false, detectedAt: new Date(), source: 'heuristic' };
        }
    }

    /**
     * Legacy price-move heuristic (fallback when Oracle unavailable).
     * Detects resolution via price extremes (<5% or >95%).
     */
    private static async legacyPriceHeuristic(marketId: string): Promise<ResolutionEvent> {
        // Import dynamically to avoid circular dependency
        const { MarketService } = await import("./market");

        const currentPrice = await MarketService.getLatestPrice(marketId);
        if (!currentPrice) {
            return { marketId, priceChange: 0, isResolution: false, detectedAt: new Date(), source: 'heuristic' };
        }

        const price = parseFloat(currentPrice.price);
        const isResolved = price < 0.05 || price > 0.95;
        const maxChange = Math.abs(price - 0.5) * 2;

        return {
            marketId,
            priceChange: maxChange,
            isResolution: isResolved || maxChange >= RESOLUTION_CONFIG.maxMovePercent,
            detectedAt: new Date(),
            source: 'heuristic'
        };
    }


    /**
     * Calculate total P&L to exclude from payout due to resolution events.
     * This is called when calculating payout eligibility.
     */
    static async getExcludedPnL(challengeId: string, cycleStart?: Date): Promise<ExcludedPnLResult> {
        const excludedPositions: ExcludedPnLResult["excludedPositions"] = [];
        let totalExcluded = 0;

        try {
            // Get closed positions in this cycle
            const closedPositions = await db.query.positions.findMany({
                where: and(
                    eq(positions.challengeId, challengeId),
                    eq(positions.status, "CLOSED"),
                    cycleStart ? gte(positions.closedAt, cycleStart) : undefined
                )
            });

            // Check each position for resolution events
            for (const pos of closedPositions) {
                const resolutionCheck = await this.isResolutionEvent(pos.marketId);

                if (resolutionCheck.isResolution) {
                    const pnl = parseFloat(pos.pnl || "0");
                    excludedPositions.push({
                        positionId: pos.id,
                        marketId: pos.marketId,
                        pnl,
                        reason: `Market resolution detected (${(resolutionCheck.priceChange * 100).toFixed(1)}% move)`
                    });
                    totalExcluded += pnl;
                }
            }

            logger.info(`[ResolutionDetector] Challenge ${challengeId.slice(0, 8)}: Excluded $${totalExcluded.toFixed(2)} from ${excludedPositions.length} positions`);
        } catch (error) {
            logger.error(`[ResolutionDetector] Error calculating excluded P&L:`, error);
        }

        return { totalExcluded, excludedPositions };
    }

    /**
     * Get all resolution events for positions in a challenge.
     * Used for audit/display purposes.
     */
    static async getResolutionEventsForChallenge(challengeId: string): Promise<ResolutionEvent[]> {
        const events: ResolutionEvent[] = [];

        try {
            const allPositions = await db.query.positions.findMany({
                where: eq(positions.challengeId, challengeId)
            });

            const checkedMarkets = new Set<string>();

            for (const pos of allPositions) {
                if (checkedMarkets.has(pos.marketId)) continue;
                checkedMarkets.add(pos.marketId);

                const event = await this.isResolutionEvent(pos.marketId);
                if (event.isResolution) {
                    events.push(event);
                }
            }
        } catch (error) {
            logger.error(`[ResolutionDetector] Error getting resolution events:`, error);
        }

        return events;
    }
}
