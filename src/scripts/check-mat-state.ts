/**
 * Diagnostic: check current state of Mat's test account.
 * Run: npx tsx src/scripts/check-mat-state.ts
 */
import { db } from "@/db";
import { challenges, positions, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function main() {
    const email = "forexampletrader@gmail.com";

    const [user] = await db.select({ id: users.id, email: users.email })
        .from(users).where(eq(users.email, email));
    if (!user) { console.error("User not found"); process.exit(1); }
    console.log("User:", user.id.slice(0, 8) + "...");

    const allChallenges = await db.select({
        id: challenges.id,
        status: challenges.status,
        balance: challenges.currentBalance,
        startBalance: challenges.startingBalance,
    }).from(challenges).where(eq(challenges.userId, user.id));

    console.log("\nChallenges:");
    for (const c of allChallenges) {
        const openPos = await db.query.positions.findMany({
            where: and(eq(positions.challengeId, c.id), eq(positions.status, "OPEN")),
            columns: { marketId: true, direction: true, sizeAmount: true }
        });
        console.log(`  [${c.status}] $${c.balance} (started $${c.startBalance}), ${openPos.length} open positions`);
        for (const p of openPos) {
            console.log(`    - ${p.marketId.slice(0, 16)} ${p.direction} $${p.sizeAmount}`);
        }
    }
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
