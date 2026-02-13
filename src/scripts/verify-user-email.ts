/**
 * Manually verify a user's email address.
 * 
 * Usage:
 *   DATABASE_URL="..." npx tsx src/scripts/verify-user-email.ts user@email.com
 * 
 * Use when email delivery fails and a user is stuck at the
 * "check your email" step after signup.
 */
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error("Usage: npx tsx src/scripts/verify-user-email.ts <email>");
        process.exit(1);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Look up the user
    const [user] = await db
        .select({ id: users.id, email: users.email, emailVerified: users.emailVerified })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

    if (!user) {
        console.error(`❌ No user found with email: ${normalizedEmail}`);
        process.exit(1);
    }

    if (user.emailVerified) {
        console.log(`✅ ${normalizedEmail} is already verified (since ${user.emailVerified})`);
        process.exit(0);
    }

    // Set emailVerified
    await db
        .update(users)
        .set({ emailVerified: new Date() })
        .where(eq(users.email, normalizedEmail));

    console.log(`✅ Email verified for ${normalizedEmail}`);
    console.log(`   User can now log in with their credentials.`);
    process.exit(0);
}

main().catch((err) => {
    console.error("Script failed:", err);
    process.exit(1);
});
