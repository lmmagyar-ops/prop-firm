// Position Price Updater
// This script should be run periodically (e.g., via cron or a background worker)
// to update the currentPrice field in positions with the latest market prices

import { db } from "../src/db";
import { positions } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { MarketService } from "../src/lib/market";

export async function updatePositionPrices() {
    try {
        console.log("[Price Updater] Starting position price update...");

        // Get all open positions
        const openPositions = await db.query.positions.findMany({
            where: eq(positions.status, "OPEN"),
        });

        console.log(`[Price Updater] Found ${openPositions.length} open positions`);

        let updated = 0;
        let failed = 0;

        for (const position of openPositions) {
            try {
                // Fetch latest price from Redis cache
                const marketData = await MarketService.getLatestPrice(position.marketId);

                if (!marketData) {
                    console.warn(`[Price Updater] No price data for market ${position.marketId}`);
                    failed++;
                    continue;
                }

                const latestPrice = parseFloat(marketData.price);

                // Update position's currentPrice
                await db
                    .update(positions)
                    .set({ currentPrice: latestPrice.toString() })
                    .where(eq(positions.id, position.id));

                updated++;
            } catch (error) {
                console.error(`[Price Updater] Failed to update position ${position.id}:`, error);
                failed++;
            }
        }

        console.log(`[Price Updater] Complete. Updated: ${updated}, Failed: ${failed}`);
    } catch (error) {
        console.error("[Price Updater] Fatal error:", error);
        throw error;
    }
}

// If run directly
if (require.main === module) {
    updatePositionPrices()
        .then(() => {
            console.log("[Price Updater] Done");
            process.exit(0);
        })
        .catch((error) => {
            console.error("[Price Updater] Error:", error);
            process.exit(1);
        });
}
