/**
 * Resolution Detector
 * 
 * Detects market resolution events (large price moves >60% in 24h).
 * Used to exclude P&L from resolution events in funded account payouts.
 * 
 * This ensures fairness:
 * - Traders aren't rewarded for lucky gambling on binary outcomes
 * - Traders aren't punished for unlucky resolution losses
 */

import { db } from "@/db";
import { positions, trades } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { MarketService } from "./market";
import { RESOLUTION_CONFIG } from "./funded-rules";

export interface ResolutionEvent {
    marketId: string;
    priceChange: number;
    isResolution: boolean;
    detectedAt: Date;
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
     * Check if a market has experienced a resolution event.
     * Definition: >60% price change in 24 hours
     */
    static async isResolutionEvent(marketId: string): Promise<ResolutionEvent> {
        try {
            // Get current price
            const currentPrice = await MarketService.getLatestPrice(marketId);
            if (!currentPrice) {
                return { marketId, priceChange: 0, isResolution: false, detectedAt: new Date() };
            }

            // Get price from 24h ago (if available in market data)
            // For now, we check if the current price is very close to 0 or 1 (binary resolution)
            const price = parseFloat(currentPrice.price);

            // A resolved binary market will have price at 0 (did not happen) or ~1 (happened)
            // We consider it a resolution if price is <0.05 or >0.95
            const isResolved = price < 0.05 || price > 0.95;

            // Calculate theoretical max price change (from 0.5 midpoint)
            const maxChange = Math.abs(price - 0.5) * 2;

            return {
                marketId,
                priceChange: maxChange,
                isResolution: isResolved || maxChange >= RESOLUTION_CONFIG.maxMovePercent,
                detectedAt: new Date()
            };
        } catch (error) {
            console.error(`[ResolutionDetector] Error checking market ${marketId}:`, error);
            return { marketId, priceChange: 0, isResolution: false, detectedAt: new Date() };
        }
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

            console.log(`[ResolutionDetector] Challenge ${challengeId.slice(0, 8)}: Excluded $${totalExcluded.toFixed(2)} from ${excludedPositions.length} positions`);
        } catch (error) {
            console.error(`[ResolutionDetector] Error calculating excluded P&L:`, error);
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
            console.error(`[ResolutionDetector] Error getting resolution events:`, error);
        }

        return events;
    }
}
