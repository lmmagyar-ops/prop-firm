import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
    const email = process.argv[2] || "l.m.magyar@gmail.com";

    const { db } = await import("@/db");
    const { users, challenges } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    // 1. Find user
    const [user] = await db.select({ id: users.id, email: users.email, role: users.role }).from(users).where(eq(users.email, email));
    if (!user) {
        console.error(`❌ User "${email}" not found. Have you signed in via Google OAuth yet?`);
        process.exit(1);
    }

    // 2. Grant admin
    if (user.role !== "admin") {
        await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
        console.log(`✅ Granted admin to ${email}`);
    } else {
        console.log(`✅ Already admin: ${email}`);
    }

    // 3. Check/create challenge
    const existingChallenges = await db.select({ id: challenges.id }).from(challenges).where(eq(challenges.userId, user.id));
    if (existingChallenges.length === 0) {
        const [c] = await db.insert(challenges).values({
            userId: user.id,
            phase: "challenge",
            status: "active",
            startingBalance: "10000.00",
            currentBalance: "10000.00",
            startOfDayBalance: "10000.00",
            highWaterMark: "10000.00",
            platform: "polymarket",
            rulesConfig: {
                startingBalance: 10000, profitTarget: 1000, profit_target_percent: 0.10,
                maxDrawdown: 1000, max_drawdown_percent: 0.10,
                maxDailyDrawdown: 500, maxDailyDrawdownPercent: 0.05,
                min_trades: 5, profit_split: 0.80,
            },
            endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }).returning({ id: challenges.id });
        console.log(`✅ Created $10K challenge: ${c.id.slice(0, 8)}...`);
    } else {
        console.log(`✅ Already has ${existingChallenges.length} challenge(s)`);
    }

    console.log(`\n🎉 Done! Refresh the dashboard.`);
    process.exit(0);
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
