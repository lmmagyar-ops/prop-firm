import { MarketService } from "./market";

export class PnLCalculator {

    /**
     * Calculates unrealized PnL for a position.
     * @param avgEntryPrice Average price paid per share
     * @param shares Number of shares held
     * @param currentPrice Current market price (YES price)
     * @param direction "YES" or "NO" - the outcome direction
     * 
     * For YES positions: profit when price goes UP
     * For NO positions: profit when price goes DOWN (we bought 1-price, now worth 1-currentPrice)
     */
    static calculateUnrealized(
        avgEntryPrice: number,
        shares: number,
        currentPrice: number,
        direction: "YES" | "NO" = "YES"
    ): number {
        if (direction === "YES") {
            // YES: PnL = (currentPrice - entryPrice) * shares
            return (currentPrice - avgEntryPrice) * shares;
        } else {
            // NO: We bought at (1 - entryPrice), current value is (1 - currentPrice)
            // PnL = ((1 - currentPrice) - (1 - entryPrice)) * shares
            //     = (entryPrice - currentPrice) * shares
            // When price goes DOWN, NO holders profit
            return (avgEntryPrice - currentPrice) * shares;
        }
    }

    /**
     * Batch calculates PnL for multiple positions using real-time cache.
     */
    static async calculatePortfolioPnL(positions: {
        assetId: string,
        shares: string,
        averageEntryPrice: string,
        direction?: "YES" | "NO"
    }[]) {
        let totalPnL = 0;
        const details = [];

        for (const pos of positions) {
            const marketData = await MarketService.getLatestPrice(pos.assetId);
            const currentPrice = marketData ? parseFloat(marketData.price) : parseFloat(pos.averageEntryPrice);
            const shares = parseFloat(pos.shares);
            const avgEntry = parseFloat(pos.averageEntryPrice);
            const direction = pos.direction || "YES";

            const pnl = this.calculateUnrealized(avgEntry, shares, currentPrice, direction);
            totalPnL += pnl;

            details.push({
                assetId: pos.assetId,
                pnl,
                currentPrice,
                value: shares * currentPrice, // Market value (for YES position value)
                direction
            });
        }

        return { totalPnL, details };
    }
}

