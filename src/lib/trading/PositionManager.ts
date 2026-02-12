import { positions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { Position } from '@/types/trading';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbTransaction = any; // Drizzle transaction - generic for flexibility

export class PositionManager {
    /**
     * Opens a new position
     */
    static async openPosition(
        tx: DbTransaction,
        challengeId: string,
        marketId: string,
        shares: number,
        entryPrice: number,
        sizeAmount: number,
        direction: "YES" | "NO" = "YES"
    ): Promise<Position> {
        // GUARD: Clamp extreme entry prices to prevent corrupted positions
        // Markets near resolution can legitimately hit 0.999... or 0.001...
        // Instead of rejecting, clamp to safe range (the invariant check in trade.ts catches truly invalid prices)
        if (entryPrice <= 0.01) entryPrice = 0.01;
        if (entryPrice >= 0.99) entryPrice = 0.99;

        const [position] = await tx.insert(positions).values({
            challengeId,
            marketId,
            direction,
            shares: shares.toString(),
            sizeAmount: sizeAmount.toString(),
            entryPrice: entryPrice.toString(),
            currentPrice: entryPrice.toString(),
            status: 'OPEN'
        }).returning();

        return position;
    }

    /**
     * Adds to an existing position (averaging)
     */
    static async addToPosition(
        tx: DbTransaction,
        positionId: string,
        additionalShares: number,
        additionalPrice: number,
        additionalAmount: number
    ): Promise<void> {
        const position = await tx.query.positions.findFirst({
            where: eq(positions.id, positionId)
        });

        if (!position) throw new Error('Position not found');

        const oldShares = parseFloat(position.shares);
        const oldAvg = parseFloat(position.entryPrice);
        const totalShares = oldShares + additionalShares;
        const newAvg = ((oldShares * oldAvg) + (additionalShares * additionalPrice)) / totalShares;

        await tx.update(positions)
            .set({
                shares: totalShares.toString(),
                entryPrice: newAvg.toString(),
                sizeAmount: (parseFloat(position.sizeAmount) + additionalAmount).toString(),
            })
            .where(eq(positions.id, positionId));
    }

    /**
     * Reduces or closes a position
     * @param exitPrice Optional live exit price - if not provided, falls back to position.currentPrice
     */
    static async reducePosition(
        tx: DbTransaction,
        positionId: string,
        sharesToSell: number,
        exitPrice?: number
    ): Promise<{ proceeds: number; remainingShares: number }> {
        const position = await tx.query.positions.findFirst({
            where: eq(positions.id, positionId)
        });

        if (!position) throw new Error('Position not found');

        const currentShares = parseFloat(position.shares);
        if (currentShares < sharesToSell) {
            throw new Error('Insufficient shares to sell');
        }

        const remainingShares = currentShares - sharesToSell;
        // Use live exit price if provided, otherwise fall back to stored price
        const finalExitPrice = exitPrice ?? parseFloat(position.currentPrice || position.entryPrice);
        const proceeds = sharesToSell * finalExitPrice;

        if (remainingShares <= 0.0001) {
            // Calculate realized PnL for the position record
            const entryPrice = parseFloat(position.entryPrice);
            const positionPnL = sharesToSell * (finalExitPrice - entryPrice);

            await tx.update(positions)
                .set({
                    status: 'CLOSED',
                    shares: '0',
                    closedAt: new Date(),
                    closedPrice: finalExitPrice.toString(),
                    pnl: positionPnL.toFixed(2)
                })
                .where(eq(positions.id, positionId));
        } else {
            // Proportionally reduce sizeAmount so risk engine sees correct exposure
            const proportionRemaining = remainingShares / currentShares;
            const updatedSize = parseFloat(position.sizeAmount) * proportionRemaining;
            await tx.update(positions)
                .set({
                    shares: remainingShares.toString(),
                    sizeAmount: updatedSize.toFixed(2),
                })
                .where(eq(positions.id, positionId));
        }

        return { proceeds, remainingShares };
    }
}
