/**
 * SETTLEMENT SERVICE — P0.3
 * 
 * Detects resolved markets and settles open positions:
 * 1. Scans all OPEN positions across active challenges
 * 2. Checks each position's market resolution via PolymarketOracle
 * 3. If resolved: closes position at resolution price, credits proceeds to balance
 * 
 * This fills the critical gap where markets resolve but positions remain
 * orphaned with no price feed and no balance update.
 * 
 * Designed to be called from a cron endpoint or worker loop.
 */

import { db } from "@/db";
import { positions, challenges } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { PolymarketOracle } from "@/lib/polymarket-oracle";
import { createLogger } from "@/lib/logger";
import { BalanceManager } from "@/lib/trading/BalanceManager";

const logger = createLogger("Settlement");

export interface SettlementResult {
    positionsChecked: number;
    positionsSettled: number;
    totalPnLSettled: number;
    errors: string[];
}

/**
 * Settle all resolved positions across all active challenges.
 */
export async function settleResolvedPositions(): Promise<SettlementResult> {
    const result: SettlementResult = {
        positionsChecked: 0,
        positionsSettled: 0,
        totalPnLSettled: 0,
        errors: [],
    };

    try {
        // 1. Get ALL open positions across active challenges
        const openPositions = await db.query.positions.findMany({
            where: eq(positions.status, "OPEN"),
        });

        if (openPositions.length === 0) {
            logger.info("No open positions to check");
            return result;
        }

        // 2. Get unique market IDs
        const uniqueMarketIds = [...new Set(openPositions.map(p => p.marketId))];
        result.positionsChecked = openPositions.length;

        logger.info("Settlement scan started", {
            openPositions: openPositions.length,
            uniqueMarkets: uniqueMarketIds.length,
        });

        // 3. Batch check resolution status
        const resolutions = await PolymarketOracle.batchGetResolutionStatus(uniqueMarketIds);

        // 4. Process resolved markets — each position settled atomically
        for (const pos of openPositions) {
            const resolution = resolutions.get(pos.marketId);
            if (!resolution || !resolution.isResolved) continue;

            // Calculate settlement price
            const entryPrice = parseFloat(pos.entryPrice);
            const shares = parseFloat(pos.shares);
            const isNo = pos.direction === "NO";

            // Resolution price: 1 if YES won, 0 if NO won
            let settlementPrice: number;
            if (resolution.resolutionPrice !== undefined) {
                // Direct resolution price from oracle (0 or 1 for binary markets)
                settlementPrice = isNo ? 1 - resolution.resolutionPrice : resolution.resolutionPrice;
            } else if (resolution.winningOutcome) {
                // Infer from winning outcome string
                const yesWon = resolution.winningOutcome.toLowerCase() === "yes";
                settlementPrice = isNo ? (yesWon ? 0 : 1) : (yesWon ? 1 : 0);
            } else {
                // Can't determine resolution price — skip
                logger.warn("Resolved market but unknown outcome", {
                    marketId: pos.marketId.slice(0, 12),
                    resolution,
                });
                continue;
            }

            const pnl = shares * (settlementPrice - entryPrice);
            const proceeds = shares * settlementPrice;
            const challengeId = pos.challengeId;

            try {
                // ATOMIC: Lock position row → verify still OPEN → close → credit balance
                // Prevents double-settlement when concurrent settlement runs overlap
                await db.transaction(async (tx) => {
                    // Lock the position row to prevent concurrent settlement
                    const lockedRows = await tx.execute(
                        sql`SELECT id, status FROM positions WHERE id = ${pos.id} FOR UPDATE`
                    );
                    const locked = lockedRows.rows?.[0] as { id: string; status: string } | undefined;

                    if (!locked || locked.status !== 'OPEN') {
                        // Already settled by a concurrent run — skip silently
                        logger.info("Position already settled, skipping", { positionId: pos.id.slice(0, 8) });
                        return;
                    }

                    // Close the position
                    const now = new Date();
                    await tx.update(positions)
                        .set({
                            status: "CLOSED",
                            shares: "0",
                            closedAt: now,
                            closedPrice: settlementPrice.toString(),
                            pnl: pnl.toFixed(2),
                        })
                        .where(eq(positions.id, pos.id));

                    // Credit proceeds to challenge balance — within same transaction
                    if (challengeId && proceeds > 0) {
                        await BalanceManager.adjustBalance(
                            tx, challengeId, proceeds, 'market_settlement'
                        );
                    }
                });

                result.positionsSettled++;
                result.totalPnLSettled += pnl;

                logger.info("Position settled", {
                    positionId: pos.id.slice(0, 8),
                    challengeId: challengeId?.slice(0, 8),
                    marketId: pos.marketId.slice(0, 12),
                    direction: pos.direction,
                    entryPrice: entryPrice.toFixed(4),
                    settlementPrice: settlementPrice.toFixed(4),
                    shares: shares.toFixed(2),
                    pnl: pnl.toFixed(2),
                    proceeds: proceeds.toFixed(2),
                    winningOutcome: resolution.winningOutcome,
                });
            } catch (error: unknown) {
                const msg = `Failed to settle position ${pos.id.slice(0, 8)}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                logger.error(msg);
                result.errors.push(msg);
            }
        }

        logger.info("Settlement scan complete", {
            checked: result.positionsChecked,
            settled: result.positionsSettled,
            totalPnL: result.totalPnLSettled.toFixed(2),
            errors: result.errors.length,
        });

    } catch (error: unknown) {
        const msg = `Settlement service error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logger.error(msg);
        result.errors.push(msg);
    }

    return result;
}
