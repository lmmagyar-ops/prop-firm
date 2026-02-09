/**
 * Resurrect a falsely-failed challenge
 * 
 * Usage:
 *   npx tsx scripts/resurrect-challenge.ts <email>
 * 
 * Example:
 *   npx tsx scripts/resurrect-challenge.ts mat@example.com
 * 
 * This will:
 *   1. Find all failed challenges for that user
 *   2. Show you which ones exist
 *   3. Fix any corrupt rulesConfig values
 *   4. Set the challenge back to "active"
 */

import { db } from "../src/db";
import { challenges, users } from "../src/db/schema";
import { eq, and } from "drizzle-orm";
import { normalizeRulesConfig } from "../src/lib/normalize-rules";

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.log("Usage: npx tsx scripts/resurrect-challenge.ts <email>");
        console.log("Example: npx tsx scripts/resurrect-challenge.ts mat@example.com");
        process.exit(1);
    }

    console.log(`\n🔍 Looking up user: ${email}\n`);

    // Find user
    const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
        console.log(`❌ No user found with email: ${email}`);
        process.exit(1);
    }

    console.log(`✅ Found user: ${user.displayName || user.email} (${user.id.slice(0, 8)}...)`);

    // Find failed challenges
    const failedChallenges = await db.query.challenges.findMany({
        where: and(
            eq(challenges.userId, user.id),
            eq(challenges.status, "failed"),
        ),
    });

    if (failedChallenges.length === 0) {
        console.log(`\n✅ No failed challenges found for this user. Nothing to resurrect.`);
        process.exit(0);
    }

    console.log(`\n📋 Found ${failedChallenges.length} failed challenge(s):\n`);

    for (const ch of failedChallenges) {
        const rules = (ch.rulesConfig as Record<string, unknown>) || {};
        const startingBalance = parseFloat(ch.startingBalance);
        const isCorrupt =
            (rules.maxDrawdown != null && (rules.maxDrawdown as number) < 1) ||
            (rules.profitTarget != null && (rules.profitTarget as number) < 1);

        console.log(`  ID: ${ch.id}`);
        console.log(`  Balance: $${parseFloat(ch.currentBalance).toLocaleString()} / $${startingBalance.toLocaleString()}`);
        console.log(`  Phase: ${ch.phase}`);
        console.log(`  maxDrawdown: ${rules.maxDrawdown} ${isCorrupt ? "⚠️  CORRUPT (decimal instead of dollars)" : "✅"}`);
        console.log(`  profitTarget: ${rules.profitTarget} ${isCorrupt ? "⚠️  CORRUPT" : "✅"}`);
        console.log(`  Started: ${ch.startedAt}`);
        console.log("");
    }

    // Resurrect all failed challenges
    for (const ch of failedChallenges) {
        const rules = (ch.rulesConfig as Record<string, unknown>) || {};
        const startingBalance = parseFloat(ch.startingBalance);
        const normalized = normalizeRulesConfig(rules, startingBalance);

        const fixedRules = {
            ...rules,
            maxDrawdown: normalized.maxDrawdown,
            profitTarget: normalized.profitTarget,
        };

        await db.update(challenges)
            .set({
                status: "active",
                rulesConfig: fixedRules,
            })
            .where(eq(challenges.id, ch.id));

        console.log(`✅ Resurrected: ${ch.id.slice(0, 8)}... → status: "active", maxDrawdown: $${normalized.maxDrawdown}, profitTarget: $${normalized.profitTarget}`);
    }

    console.log(`\n🎉 Done! ${failedChallenges.length} challenge(s) restored.\n`);
    process.exit(0);
}

main().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
