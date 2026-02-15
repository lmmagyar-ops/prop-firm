/**
 * One-shot migration: Set existing users to public leaderboard visibility.
 * 
 * Run locally with production DATABASE_URL:
 *   DATABASE_URL="..." npx tsx src/scripts/migrate-privacy-public.ts
 * 
 * Or deploy and hit the admin endpoint.
 */
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
    console.log("Migrating leaderboard privacy: semi_private → public...");

    const result = await db.execute(
        sql`UPDATE users SET leaderboard_privacy = 'public' WHERE leaderboard_privacy = 'semi_private' OR leaderboard_privacy IS NULL`
    );

    console.log(`Updated ${result.rowCount} users to public leaderboard visibility.`);
    process.exit(0);
}

main().catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
});
