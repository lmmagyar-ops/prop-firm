// Query positions to debug the 78% profit issue
import { db } from "../src/db";
import { positions } from "../src/db/schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function debugPositions() {
    try {
        console.log("🔍 Querying open positions...\n");

        const openPositions = await db.query.positions.findMany({
            where: eq(positions.status, "OPEN"),
        });

        if (openPositions.length === 0) {
            console.log("No open positions found.");
            return;
        }

        console.log(`Found ${openPositions.length} open position(s):\n`);

        for (const pos of openPositions) {
            const entry = parseFloat(pos.entryPrice);
            const current = parseFloat(pos.currentPrice || pos.entryPrice);
            const shares = parseFloat(pos.shares);
            const sizeAmount = parseFloat(pos.sizeAmount);
            const unrealizedPnL = (current - entry) * shares;
            const roi = sizeAmount > 0 ? (unrealizedPnL / sizeAmount) * 100 : 0;

            console.log(`Position ID: ${pos.id}`);
            console.log(`Market ID: ${pos.marketId}`);
            console.log(`Direction: ${pos.direction}`);
            console.log(`Size: $${sizeAmount.toFixed(2)}`);
            console.log(`Shares: ${shares.toFixed(2)}`);
            console.log(`Entry Price: ${entry.toFixed(4)} (${(entry * 100).toFixed(2)}¢)`);
            console.log(`Current Price: ${current.toFixed(4)} (${(current * 100).toFixed(2)}¢)`);
            console.log(`Unrealized P&L: $${unrealizedPnL.toFixed(2)}`);
            console.log(`ROI: ${roi.toFixed(2)}%`);
            console.log(`Status: ${pos.status}`);
            console.log(`Opened: ${pos.openedAt}`);
            console.log("---");
        }

        // Check if any position has the 78% issue
        const suspiciousPositions = openPositions.filter(pos => {
            const entry = parseFloat(pos.entryPrice);
            const current = parseFloat(pos.currentPrice || pos.entryPrice);
            const shares = parseFloat(pos.shares);
            const sizeAmount = parseFloat(pos.sizeAmount);
            const unrealizedPnL = (current - entry) * shares;
            const roi = sizeAmount > 0 ? (unrealizedPnL / sizeAmount) * 100 : 0;
            return Math.abs(roi - 78) < 5; // Within 5% of 78%
        });

        if (suspiciousPositions.length > 0) {
            console.log("\n⚠️  Found position(s) with ~78% ROI:");
            for (const pos of suspiciousPositions) {
                const entry = parseFloat(pos.entryPrice);
                const current = parseFloat(pos.currentPrice || pos.entryPrice);
                console.log(`\nPosition ${pos.id}:`);
                console.log(`  Entry: ${entry} | Current: ${current}`);
                console.log(`  Difference: ${current - entry} (${((current - entry) / entry * 100).toFixed(2)}% price change)`);
                console.log(`  This suggests currentPrice was set to ${current} instead of ${entry}`);
            }
        }

    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

debugPositions();
