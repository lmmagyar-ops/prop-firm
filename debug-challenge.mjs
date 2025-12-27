import { db } from "./src/db/index.js";
import { challenges, trades, positions } from "./src/db/schema.js";
import { eq, desc } from "drizzle-orm";

async function checkChallenge() {
    // Get latest challenge for demo-user-1
    const challenge = await db.query.challenges.findFirst({
        where: eq(challenges.userId, "demo-user-1"),
        orderBy: [desc(challenges.startedAt)]
    });

    if (!challenge) {
        console.log("No challenge found");
        return;
    }

    console.log("\n=== CHALLENGE DATA ===");
    console.log("ID:", challenge.id);
    console.log("Starting Balance:", challenge.startingBalance);
    console.log("Current Balance:", challenge.currentBalance);
    console.log("Rules Config:", JSON.stringify(challenge.rulesConfig, null, 2));

    // Get recent trades
    const recentTrades = await db.query.trades.findMany({
        where: eq(trades.challengeId, challenge.id),
        orderBy: [desc(trades.executedAt)],
        limit: 5
    });

    console.log("\n=== RECENT TRADES ===");
    recentTrades.forEach((trade, i) => {
        console.log(`\nTrade ${i + 1}:`);
        console.log("  Amount: $" + trade.amount);
        console.log("  Type:", trade.type);
        console.log("  Market ID:", trade.marketId);
        console.log("  Executed:", trade.executedAt);
    });

    // Get open positions
    const openPos = await db.query.positions.findMany({
        where: eq(positions.challengeId, challenge.id)
    });

    console.log("\n=== OPEN POSITIONS ===");
    openPos.forEach((pos, i) => {
        console.log(`\nPosition ${i + 1}:`);
        console.log("  Market:", pos.marketId);
        console.log("  Size: $" + pos.sizeAmount);
        console.log("  Status:", pos.status);
    });
}

checkChallenge().then(() => process.exit(0)).catch(console.error);
