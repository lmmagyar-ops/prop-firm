// Quick script to investigate Mat's suspicious P&L
// Run with: npx tsx src/scripts/investigate-pnl.ts

import { db } from "@/db";
import { users, challenges, trades, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

async function investigate() {
    console.log("\n=== Investigating Mat's P&L ===\n");

    // Find Mat's accounts (both emails)
    const matUsers = await db.query.users.findMany({
        where: (users, { or, like }) => or(
            like(users.email, '%mattasa%'),
            like(users.email, '%marcio%')
        )
    });

    console.log("Found users:", matUsers.map(u => ({ email: u.email, id: u.id.slice(0, 8) })));

    for (const user of matUsers) {
        console.log(`\n--- User: ${user.email} ---`);

        // Get challenges
        const userChallenges = await db.query.challenges.findMany({
            where: eq(challenges.userId, user.id)
        });

        console.log(`Challenges: ${userChallenges.length}`);

        for (const challenge of userChallenges) {
            const rulesConfig = challenge.rulesConfig as any;
            const startingBalance = rulesConfig?.startingBalance || 10000;
            const currentBalance = parseFloat(challenge.currentBalance);
            const pnl = currentBalance - startingBalance;

            console.log(`\n  Challenge ${challenge.id.slice(0, 8)}:`);
            console.log(`    Status: ${challenge.status}`);
            console.log(`    Starting Balance: $${startingBalance}`);
            console.log(`    Current Balance: $${currentBalance}`);
            console.log(`    P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`);

            // Get trades for this challenge
            const challengeTrades = await db.query.trades.findMany({
                where: eq(trades.challengeId, challenge.id),
                orderBy: (trades, { desc }) => [desc(trades.executedAt)]
            });

            console.log(`    Trades: ${challengeTrades.length}`);

            for (const trade of challengeTrades) {
                const shares = parseFloat(trade.shares);
                const price = parseFloat(trade.price);
                const amount = parseFloat(trade.amount);

                console.log(`      ${trade.type} @ $${price.toFixed(4)} | ${shares.toFixed(2)} shares | $${amount.toFixed(2)} | ${trade.marketId.slice(0, 20)}...`);
            }

            // Get positions
            const challengePositions = await db.query.positions.findMany({
                where: eq(positions.challengeId, challenge.id)
            });

            console.log(`    Positions: ${challengePositions.length}`);

            for (const pos of challengePositions) {
                const entry = parseFloat(pos.entryPrice);
                const shares = parseFloat(pos.shares);
                const sizeAmount = parseFloat(pos.sizeAmount || '0');

                console.log(`      ${pos.status} ${pos.direction} @ $${entry.toFixed(4)} | ${shares.toFixed(2)} shares | invested $${sizeAmount.toFixed(2)} | ${pos.marketId.slice(0, 20)}...`);
            }
        }
    }

    console.log("\n=== Investigation Complete ===\n");
    process.exit(0);
}

investigate().catch(console.error);
