/**
 * Zombie Position Cleanup
 * 
 * Closes OPEN positions on challenges that have already failed.
 * These are "zombie positions" — they shouldn't affect any live calculations
 * but are data hygiene issues.
 * 
 * Run: node --env-file=.env.local --import=tsx src/scripts/cleanup-zombies.ts
 */

import 'dotenv/config';
import { db } from "../db";
import { challenges, positions } from "../db/schema";
import { eq, and } from "drizzle-orm";

async function cleanupZombies() {
    console.log("🧟 Zombie Position Cleanup\n");

    // Find all OPEN positions on failed challenges
    const zombies = await db
        .select({
            positionId: positions.id,
            challengeId: positions.challengeId,
            marketId: positions.marketId,
            shares: positions.shares,
            direction: positions.direction,
            challengeStatus: challenges.status,
        })
        .from(positions)
        .innerJoin(challenges, eq(positions.challengeId, challenges.id))
        .where(
            and(
                eq(positions.status, "OPEN"),
                eq(challenges.status, "failed")
            )
        );

    if (zombies.length === 0) {
        console.log("✅ No zombie positions found. Database is clean.");
        process.exit(0);
    }

    console.log(`Found ${zombies.length} zombie position(s):\n`);
    for (const z of zombies) {
        console.log(`  Position: ${z.positionId.slice(0, 8)}`);
        console.log(`  Challenge: ${z.challengeId?.slice(0, 8)} (status: ${z.challengeStatus})`);
        console.log(`  Market: ${z.marketId?.slice(0, 20)}`);
        console.log(`  Shares: ${z.shares} ${z.direction}`);
        console.log("");
    }

    // Close all zombie positions
    let closed = 0;
    for (const z of zombies) {
        await db
            .update(positions)
            .set({
                status: "CLOSED",
                closedAt: new Date(),
            })
            .where(eq(positions.id, z.positionId));
        closed++;
    }

    console.log(`✅ Closed ${closed} zombie position(s).`);
    process.exit(0);
}

cleanupZombies().catch((err) => {
    console.error("❌ Cleanup failed:", err);
    process.exit(1);
});
