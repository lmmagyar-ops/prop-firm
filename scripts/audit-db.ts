/**
 * Database Audit Script
 * Finds corrupted positions and unexpected funded challenges
 * 
 * Run with: npx tsx scripts/audit-db.ts
 */

import { db } from "../src/db";
import { positions, challenges } from "../src/db/schema";
import { eq, or, sql } from "drizzle-orm";

async function auditDatabase() {
    console.log("🔍 DATABASE AUDIT - Finding corrupted data...\n");

    // 1. Find positions with invalid entry prices (≤0.01 or ≥0.99)
    console.log("=== POSITIONS WITH INVALID ENTRY PRICES ===");
    const invalidPositions = await db.query.positions.findMany({
        where: or(
            sql`CAST(${positions.entryPrice} AS DECIMAL) <= 0.01`,
            sql`CAST(${positions.entryPrice} AS DECIMAL) >= 0.99`
        )
    });

    if (invalidPositions.length === 0) {
        console.log("✅ No positions with invalid entry prices found.\n");
    } else {
        console.log(`⚠️  Found ${invalidPositions.length} positions with invalid entry prices:\n`);
        for (const pos of invalidPositions) {
            console.log(`  ID: ${pos.id.slice(0, 8)}...`);
            console.log(`  Market: ${pos.marketId.slice(0, 30)}...`);
            console.log(`  Direction: ${pos.direction}`);
            console.log(`  Entry Price: ${pos.entryPrice}`);
            console.log(`  Shares: ${pos.shares}`);
            console.log(`  Status: ${pos.status}`);
            console.log(`  Created: ${pos.openedAt}`);
            console.log("");
        }
    }

    // 2. Find challenges with phase='funded'
    console.log("=== CHALLENGES WITH PHASE='FUNDED' ===");
    const fundedChallenges = await db.query.challenges.findMany({
        where: eq(challenges.phase, "funded")
    });

    if (fundedChallenges.length === 0) {
        console.log("✅ No funded challenges found.\n");
    } else {
        console.log(`📋 Found ${fundedChallenges.length} funded challenges:\n`);
        for (const ch of fundedChallenges) {
            console.log(`  ID: ${ch.id.slice(0, 8)}...`);
            console.log(`  User: ${ch.userId?.slice(0, 12)}...`);
            console.log(`  Status: ${ch.status}`);
            console.log(`  Balance: $${ch.currentBalance}`);
            console.log(`  Started: ${ch.startedAt}`);
            console.log("");
        }
    }

    // 3. Summary
    console.log("=== SUMMARY ===");
    console.log(`Invalid positions: ${invalidPositions.length}`);
    console.log(`Funded challenges: ${fundedChallenges.length}`);

    // Return data for cleanup
    return { invalidPositions, fundedChallenges };
}

// Run if executed directly
auditDatabase()
    .then(() => {
        console.log("\n✅ Audit complete.");
        process.exit(0);
    })
    .catch((err) => {
        console.error("❌ Audit failed:", err);
        process.exit(1);
    });
