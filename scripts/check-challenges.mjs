import { db } from "./src/db/index.js";
import { challenges } from "./src/db/schema.js";
import { desc } from "drizzle-orm";

async function checkChallenges() {
    try {
        const results = await db.select().from(challenges).orderBy(desc(challenges.startedAt)).limit(10);

        console.log("\n=== Recent Challenges ===\n");

        if (results.length === 0) {
            console.log("No challenges found in database.");
        } else {
            results.forEach((challenge, index) => {
                console.log(`${index + 1}. Challenge ID: ${challenge.id.substring(0, 8)}...`);
                console.log(`   User ID: ${challenge.userId}`);
                console.log(`   Status: ${challenge.status}`);
                console.log(`   Phase: ${challenge.phase}`);
                console.log(`   Balance: $${challenge.currentBalance}`);
                console.log(`   Started: ${challenge.startedAt || 'Not started'}`);
                console.log("");
            });
        }

        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkChallenges();
