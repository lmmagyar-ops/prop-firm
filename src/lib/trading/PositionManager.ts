import { db } from '@/db';
import { positions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { Position } from '@/types/trading';

export class PositionManager {
    /**
     * Opens a new position
     */
    static async openPosition(
        tx: any, // Drizzle transaction
        challengeId: string,
        marketId: string,
        shares: number,
        entryPrice: number,
        sizeAmount: number,
        direction: "YES" | "NO" = "YES"
    ): Promise<Position> {
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
        tx: any,
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
                currentPrice: additionalPrice.toString(), // Update current price to latest trade price
            })
            .where(eq(positions.id, positionId));
    }

    /**
     * Reduces or closes a position
     */
    static async reducePosition(
        tx: any,
        positionId: string,
        sharesToSell: number
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
        const exitPrice = parseFloat(position.currentPrice || position.entryPrice);
        const proceeds = sharesToSell * exitPrice;

        if (remainingShares <= 0.0001) {
            await tx.update(positions)
                .set({ status: 'CLOSED', shares: '0', closedAt: new Date() })
                .where(eq(positions.id, positionId));
        } else {
            await tx.update(positions)
                .set({ shares: remainingShares.toString() })
                .where(eq(positions.id, positionId));
        }

        return { proceeds, remainingShares };
    }
}
