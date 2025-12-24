
import { db } from "@/db";
import { users, challenges } from "@/db/schema";
import { count } from "drizzle-orm";

async function main() {
    try {
        console.log("Checking DB state...");
        const userCount = await db.select({ count: count() }).from(users);
        const challengeCount = await db.select({ count: count() }).from(challenges);

        console.log("Users:", userCount[0].count);
        console.log("Challenges:", challengeCount[0].count);

        if (challengeCount[0].count === 0) {
            console.log("Seeding mock trader...");
            const [newUser] = await db.insert(users).values({
                email: "mock_trader@example.com",
                name: "Mock Trader"
            }).returning();

            await db.insert(challenges).values({
                userId: newUser.id,
                status: "active",
                phase: "challenge",
                currentBalance: "10500.00",
                startingBalance: "10000.00",
                rulesConfig: {
                    startingBalance: "10000",
                    max_drawdown_percent: 10,
                    profit_target_percent: 10
                }
            });
            console.log("Seeded mock trader and challenge.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

main();
