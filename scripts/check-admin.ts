import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Dynamic import AFTER env is loaded (static imports hoist above dotenv.config)
async function main() {
    const { db } = await import("@/db");
    const { users, challenges } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    console.log("[1] Checking if user exists...");
    const existingUser = await db
        .select({ id: users.id, email: users.email, role: users.role, name: users.name })
        .from(users)
        .where(eq(users.email, "l.m.magyar@gmail.com"));

    if (existingUser.length > 0) {
        console.log("✅ User EXISTS:", JSON.stringify(existingUser[0]));

        const userChallenges = await db
            .select({ id: challenges.id, status: challenges.status, phase: challenges.phase, currentBalance: challenges.currentBalance })
            .from(challenges)
            .where(eq(challenges.userId, existingUser[0].id));

        console.log(`\n[2] Challenges found: ${userChallenges.length}`);
        for (const c of userChallenges) {
            console.log(`  - ${c.id.slice(0, 8)}... status=${c.status} phase=${c.phase} balance=$${c.currentBalance}`);
        }
    } else {
        console.log("❌ User NOT FOUND in database");
    }

    const allUsers = await db
        .select({ id: users.id, email: users.email, role: users.role })
        .from(users);
    console.log(`\n[3] All users in DB (${allUsers.length}):`);
    for (const u of allUsers) {
        console.log(`  - ${u.email} (role=${u.role}, id=${u.id.slice(0, 12)}...)`);
    }

    process.exit(0);
}

main().catch(e => {
    console.error("Error:", e.message);
    process.exit(1);
});
