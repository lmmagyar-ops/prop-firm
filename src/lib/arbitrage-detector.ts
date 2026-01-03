import { db } from "@/db";
import { positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getActiveEvents, Platform } from "@/app/actions/market";

export interface ArbCheckResult {
    isArb: boolean;
    reason?: string;
}

/**
 * Detects and blocks trades that would create risk-free arbitrage positions.
 * 
 * Arbitrage in prediction markets occurs when a user holds positions on all
 * possible outcomes of a market, guaranteeing profit regardless of resolution.
 */
export class ArbitrageDetector {

    /**
     * Check if executing this trade would create an arbitrage position.
     * Handles both binary (YES/NO) and multi-runner (3+ outcomes) markets.
     * 
     * @param challengeId - The challenge ID
     * @param marketId - The market being traded
     * @param direction - The direction of the new trade (YES or NO)
     * @param platform - The platform (polymarket or kalshi)
     * @returns { isArb: true, reason: string } if trade would create arb
     */
    static async wouldCreateArbitrage(
        challengeId: string,
        marketId: string,
        direction: "YES" | "NO",
        platform: Platform = "kalshi"
    ): Promise<ArbCheckResult> {

        // --- Check 1: Binary YES/NO Arbitrage ---
        // Block if user already holds the opposite direction on this exact market
        const oppositeDirection = direction === "YES" ? "NO" : "YES";

        const existingOppositePosition = await db.query.positions.findFirst({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.marketId, marketId),
                eq(positions.direction, oppositeDirection),
                eq(positions.status, "OPEN")
            )
        });

        if (existingOppositePosition) {
            const existingShares = parseFloat(existingOppositePosition.shares);

            return {
                isArb: true,
                reason: `Arbitrage blocked: You have an open ${oppositeDirection} position (${existingShares.toFixed(2)} shares). Close it before opening a ${direction} position on this market.`
            };
        }

        // --- Check 2: Multi-Runner Arbitrage ---
        // For multi-outcome events (e.g., "Who will win?"), block if buying would complete all outcomes
        const siblingMarketIds = await this.getSiblingMarketIds(marketId, platform);

        if (siblingMarketIds.length > 1) {
            // This is a multi-runner market
            const arbCheck = await this.checkMultiRunnerArbitrage(
                challengeId,
                marketId,
                siblingMarketIds
            );
            if (arbCheck.isArb) {
                return arbCheck;
            }
        }

        return { isArb: false };
    }

    /**
     * Get all sibling market IDs for a given market (all outcomes in the same event).
     * Returns empty array if market is standalone (binary).
     */
    private static async getSiblingMarketIds(marketId: string, platform: Platform): Promise<string[]> {
        try {
            const events = await getActiveEvents(platform);

            for (const event of events) {
                // Check if this market is in this event
                const marketInEvent = event.markets?.find(m => m.id === marketId);
                if (marketInEvent && event.markets && event.markets.length > 1) {
                    // Return all market IDs in this event
                    return event.markets.map(m => m.id);
                }
            }

            return []; // Standalone market
        } catch (error) {
            console.error("[ArbitrageDetector] Error fetching sibling markets:", error);
            return [];
        }
    }

    /**
     * Check if buying this market would complete an arbitrage position
     * (user would hold all outcomes in a multi-runner event).
     * 
     * @param challengeId - The challenge ID
     * @param targetMarketId - The market the user wants to buy
     * @param allSiblingIds - All market IDs in the same event
     */
    private static async checkMultiRunnerArbitrage(
        challengeId: string,
        targetMarketId: string,
        allSiblingIds: string[]
    ): Promise<ArbCheckResult> {
        // Get all open positions for this challenge
        const openPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.status, "OPEN")
            )
        });

        // Find which sibling markets the user already holds (YES positions)
        const heldSiblingIds = new Set(
            openPositions
                .filter(p => allSiblingIds.includes(p.marketId) && p.direction === "YES")
                .map(p => p.marketId)
        );

        // If user already holds all OTHER siblings, buying this one would complete the arb
        const otherSiblings = allSiblingIds.filter(id => id !== targetMarketId);
        const userHoldsAllOthers = otherSiblings.every(id => heldSiblingIds.has(id));

        if (userHoldsAllOthers && otherSiblings.length > 0) {
            return {
                isArb: true,
                reason: `Arbitrage blocked: You already hold positions on ${otherSiblings.length} other outcome(s) in this event. Buying this outcome would guarantee risk-free profit. Close at least one other position first.`
            };
        }

        return { isArb: false };
    }
}
