/**
 * Reset Mat's funded challenge balance to startingBalance ($25,000).
 * 
 * ROOT CAUSE: risk-monitor's triggerPass credited position proceeds AFTER
 * resetting balance, inflating it to $29,147.64 instead of $25,000.
 * 
 * This script also resets highWaterMark and startOfDayBalance/Equity
 * to match, so daily PnL and drawdown calculations are correct.
 * 
 * Run: timeout 30 npx tsx src/scripts/reset-mat-funded-balance.ts
 * 
 * SAFETY: This is a READ-THEN-WRITE script. It prints current state,
 * asks for confirmation via a DRY_RUN=false env var, and logs the change.
 */
import { db } from "@/db";
import { challenges, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function main() {
    const email = "forexampletrader@gmail.com";
    const isDryRun = process.env.DRY_RUN !== "false";

    // 1. Find the user
    const [user] = await db.select({ id: users.id, email: users.email })
        .from(users).where(eq(users.email, email));
    if (!user) { console.error("User not found:", email); process.exit(1); }
    console.log("User:", user.id.slice(0, 8) + "...", user.email);

    // 2. Find the active funded challenge
    const [funded] = await db.select({
        id: challenges.id,
        status: challenges.status,
        phase: challenges.phase,
        currentBalance: challenges.currentBalance,
        startingBalance: challenges.startingBalance,
        highWaterMark: challenges.highWaterMark,
        startOfDayBalance: challenges.startOfDayBalance,
        startOfDayEquity: challenges.startOfDayEquity,
    }).from(challenges).where(and(
        eq(challenges.userId, user.id),
        eq(challenges.status, "active"),
        eq(challenges.phase, "funded"),
    ));

    if (!funded) {
        console.log("No active funded challenge found. Nothing to reset.");
        process.exit(0);
    }

    const startingBalance = parseFloat(funded.startingBalance);
    const currentBalance = parseFloat(funded.currentBalance);
    const delta = currentBalance - startingBalance;

    console.log("\nFunded Challenge:", funded.id.slice(0, 8) + "...");
    console.log("  Status:", funded.status, "/ Phase:", funded.phase);
    console.log("  Starting Balance:", `$${startingBalance.toFixed(2)}`);
    console.log("  Current Balance:", `$${currentBalance.toFixed(2)}`);
    console.log("  Delta (should be 0):", `$${delta.toFixed(2)}`);
    console.log("  High Water Mark:", funded.highWaterMark);
    console.log("  SOD Balance:", funded.startOfDayBalance);
    console.log("  SOD Equity:", funded.startOfDayEquity);

    if (Math.abs(delta) < 0.01) {
        console.log("\n✅ Balance is already correct. No reset needed.");
        process.exit(0);
    }

    if (isDryRun) {
        console.log("\n🔍 DRY RUN — would reset to $" + startingBalance.toFixed(2));
        console.log("   Run with DRY_RUN=false to apply.");
        process.exit(0);
    }

    // 3. Reset balance, HWM, and SOD fields
    console.log("\n⚡ Resetting balance to $" + startingBalance.toFixed(2) + "...");
    await db.update(challenges)
        .set({
            currentBalance: startingBalance.toString(),
            highWaterMark: startingBalance.toString(),
            startOfDayBalance: startingBalance.toString(),
            startOfDayEquity: startingBalance.toString(),
        })
        .where(eq(challenges.id, funded.id));

    // 4. Verify
    const [verify] = await db.select({ currentBalance: challenges.currentBalance })
        .from(challenges).where(eq(challenges.id, funded.id));

    const newBalance = parseFloat(verify.currentBalance);
    if (Math.abs(newBalance - startingBalance) < 0.01) {
        console.log("✅ Balance reset successful: $" + newBalance.toFixed(2));
    } else {
        console.error("❌ VERIFICATION FAILED — balance is $" + newBalance.toFixed(2));
        process.exit(1);
    }

    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
