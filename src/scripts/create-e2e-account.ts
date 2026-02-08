/**
 * Create E2E Test Account
 * 
 * Run with: node --env-file=.env.local --import=tsx src/scripts/create-e2e-account.ts
 * 
 * Creates a pre-verified test account for Playwright E2E tests.
 * If the account already exists, it resets the password.
 */

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const E2E_EMAIL = "e2e-test@predictionsfirm.com";
const E2E_PASSWORD = "TestBot2026!";
const SALT_ROUNDS = 12;

async function main() {
    console.log("🔧 Creating E2E test account...");

    const passwordHash = await bcrypt.hash(E2E_PASSWORD, SALT_ROUNDS);

    // Check if user already exists
    const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, E2E_EMAIL))
        .limit(1);

    if (existing.length > 0) {
        // Update password and ensure email is verified
        await db
            .update(users)
            .set({
                passwordHash,
                emailVerified: new Date(),
                isActive: true,
            })
            .where(eq(users.email, E2E_EMAIL));

        console.log(`✅ Updated existing account: ${E2E_EMAIL}`);
    } else {
        // Create new user with email pre-verified
        await db.insert(users).values({
            email: E2E_EMAIL,
            firstName: "E2E",
            lastName: "Bot",
            name: "E2E Bot",
            country: "US",
            passwordHash,
            role: "user",
            isActive: true,
            emailVerified: new Date(), // Pre-verified — no email confirmation needed
            agreedToTermsAt: new Date(),
        });

        console.log(`✅ Created new account: ${E2E_EMAIL}`);
    }

    console.log(`   Email:    ${E2E_EMAIL}`);
    console.log(`   Password: ${E2E_PASSWORD}`);
    console.log("");
    console.log("Add these to .env.local:");
    console.log(`   E2E_USER_EMAIL=${E2E_EMAIL}`);
    console.log(`   E2E_USER_PASSWORD=${E2E_PASSWORD}`);

    process.exit(0);
}

main().catch((err) => {
    console.error("❌ Failed:", err);
    process.exit(1);
});
