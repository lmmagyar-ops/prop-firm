/**
 * AUDIT 5: Orphaned Record Scan
 * 
 * Finds database records that violate referential integrity:
 * 1. Positions where challengeId has no matching challenge
 * 2. Trades where positionId has no matching position
 * 3. Challenges where userId has no matching user
 * 4. OPEN positions on failed/passed challenges (should have been closed)
 * 
 * Usage: npx tsx src/scripts/audit-orphans.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { db } from "@/db";
import { sql } from "drizzle-orm";

async function runOrphanScan() {
    console.log("\n🔍 ═══════════════════════════════════════════════");
    console.log("   AUDIT 5: ORPHANED RECORD SCAN");
    console.log("   ═══════════════════════════════════════════════\n");

    let totalOrphans = 0;

    // 1. Positions with no matching challenge
    console.log("📋 Check 1: Positions with no matching challenge...");
    const orphanPositions = await db.execute(sql`
        SELECT p.id, p.challenge_id, p.market_id, p.status, p.shares
        FROM positions p
        LEFT JOIN challenges c ON p.challenge_id = c.id
        WHERE c.id IS NULL
    `);
    const orphanPosCount = orphanPositions.rows?.length || 0;
    console.log(`  ${orphanPosCount === 0 ? '✅' : '❌'} ${orphanPosCount} orphaned positions`);
    if (orphanPosCount > 0) {
        for (const row of orphanPositions.rows || []) {
            console.log(`    - Position ${(row as Record<string, string>).id?.slice(0, 8)} | challenge: ${(row as Record<string, string>).challenge_id?.slice(0, 8)} | ${(row as Record<string, string>).status}`);
        }
    }
    totalOrphans += orphanPosCount;

    // 2. Trades with no matching position
    console.log("\n📋 Check 2: Trades with no matching position...");
    const orphanTrades = await db.execute(sql`
        SELECT t.id, t.position_id, t.challenge_id, t.type, t.amount
        FROM trades t
        LEFT JOIN positions p ON t.position_id = p.id
        WHERE t.position_id IS NOT NULL AND p.id IS NULL
    `);
    const orphanTradeCount = orphanTrades.rows?.length || 0;
    console.log(`  ${orphanTradeCount === 0 ? '✅' : '❌'} ${orphanTradeCount} orphaned trades`);
    if (orphanTradeCount > 0) {
        for (const row of orphanTrades.rows || []) {
            console.log(`    - Trade ${(row as Record<string, string>).id?.slice(0, 8)} | position: ${(row as Record<string, string>).position_id?.slice(0, 8)} | ${(row as Record<string, string>).type} $${(row as Record<string, string>).amount}`);
        }
    }
    totalOrphans += orphanTradeCount;

    // 3. Challenges with no matching user
    console.log("\n📋 Check 3: Challenges with no matching user...");
    const orphanChallenges = await db.execute(sql`
        SELECT c.id, c.user_id, c.phase, c.status, c.current_balance
        FROM challenges c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE u.id IS NULL
    `);
    const orphanChalCount = orphanChallenges.rows?.length || 0;
    console.log(`  ${orphanChalCount === 0 ? '✅' : '❌'} ${orphanChalCount} orphaned challenges`);
    if (orphanChalCount > 0) {
        for (const row of orphanChallenges.rows || []) {
            console.log(`    - Challenge ${(row as Record<string, string>).id?.slice(0, 8)} | user: ${(row as Record<string, string>).user_id?.slice(0, 8)} | ${(row as Record<string, string>).phase}/${(row as Record<string, string>).status}`);
        }
    }
    totalOrphans += orphanChalCount;

    // 4. OPEN positions on failed/passed (non-active) challenges
    console.log("\n📋 Check 4: OPEN positions on non-active challenges...");
    const zombiePositions = await db.execute(sql`
        SELECT p.id, p.challenge_id, p.market_id, p.shares, c.status as challenge_status, c.phase
        FROM positions p
        JOIN challenges c ON p.challenge_id = c.id
        WHERE p.status = 'OPEN' AND c.status = 'failed'
    `);
    const zombieCount = zombiePositions.rows?.length || 0;
    console.log(`  ${zombieCount === 0 ? '✅' : '⚠️'} ${zombieCount} zombie positions (OPEN on failed challenges)`);
    if (zombieCount > 0) {
        for (const row of (zombiePositions.rows || []).slice(0, 10)) {
            console.log(`    - Position ${(row as Record<string, string>).id?.slice(0, 8)} | challenge: ${(row as Record<string, string>).challenge_id?.slice(0, 8)} (${(row as Record<string, string>).challenge_status}) | ${(row as Record<string, string>).shares} shares`);
        }
        if (zombieCount > 10) console.log(`    ... and ${zombieCount - 10} more`);
    }
    // Zombies are a warning, not a hard failure (positions are just not realized)

    // 5. Trades with no challengeId at all
    console.log("\n📋 Check 5: Trades with NULL challengeId...");
    const nullChallengeTrades = await db.execute(sql`
        SELECT id, market_id, type, amount
        FROM trades
        WHERE challenge_id IS NULL
    `);
    const nullChalCount = nullChallengeTrades.rows?.length || 0;
    console.log(`  ${nullChalCount === 0 ? '✅' : '❌'} ${nullChalCount} trades with no challenge link`);
    totalOrphans += nullChalCount;

    // Summary
    console.log("\n═══════════════════════════════════════════════");
    console.log("   ORPHAN SCAN RESULTS");
    console.log("═══════════════════════════════════════════════\n");
    console.log(`  Orphaned positions: ${orphanPosCount}`);
    console.log(`  Orphaned trades: ${orphanTradeCount}`);
    console.log(`  Orphaned challenges: ${orphanChalCount}`);
    console.log(`  Null-challenge trades: ${nullChalCount}`);
    console.log(`  Zombie positions: ${zombieCount} (warning)`);
    console.log(`  Total hard orphans: ${totalOrphans}`);

    const result = totalOrphans === 0 ? "🟢 PASS" : "🔴 FAIL";
    console.log(`\n  RESULT: ${result}\n`);

    process.exit(totalOrphans > 0 ? 1 : 0);
}

runOrphanScan().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
