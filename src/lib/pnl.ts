import { MarketService } from "./market";

export class PnLCalculator {

    /**
     * Calculates unrealized PnL for a position.
     * @param avgEntryPrice Average price paid per share
     * @param shares Number of shares held
     * @param currentPrice Current market price
     * @param side "LONG" (short not supported yet)
     */
    static calculateUnrealized(avgEntryPrice: number, shares: number, currentPrice: number, side: "LONG" | "SHORT" = "LONG") {
        if (side === "LONG") {
            // Value = Shares * CurrentPrice
            // Cost = Shares * AvgEntryPrice
            // PnL = Value - Cost
            return (shares * currentPrice) - (shares * avgEntryPrice);
        }
        // SHORT logic would be different
        return 0;
    }

    /**
     * Batch calculates PnL for multiple positions using real-time cache.
     */
    static async calculatePortfolioPnL(positions: { assetId: string, shares: string, averageEntryPrice: string }[]) {
        let totalPnL = 0;
        const details = [];

        for (const pos of positions) {
            const marketData = await MarketService.getLatestPrice(pos.assetId);
            const currentPrice = marketData ? parseFloat(marketData.price) : parseFloat(pos.averageEntryPrice); // Fallback to entry if no data
            const shares = parseFloat(pos.shares);
            const avgEntry = parseFloat(pos.averageEntryPrice);

            const pnl = this.calculateUnrealized(avgEntry, shares, currentPrice);
            totalPnL += pnl;

            details.push({
                assetId: pos.assetId,
                pnl,
                currentPrice,
                value: shares * currentPrice
            });
        }

        return { totalPnL, details };
    }
}
