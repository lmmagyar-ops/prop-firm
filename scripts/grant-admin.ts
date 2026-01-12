/**
 * Admin Grant Script
 * 
 * Grants admin role to specified email addresses.
 * Run with: npx tsx scripts/grant-admin.ts email1@example.com email2@example.com
 */

import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";

async function grantAdmin(emails: string[]) {
    if (emails.length === 0) {
        console.log("Usage: npx tsx scripts/grant-admin.ts email1@example.com email2@example.com");
        process.exit(1);
    }

    console.log("\n🔐 Admin Grant Script\n");
    console.log("Emails to grant admin:", emails);

    // First, check which users exist
    const existingUsers = await db
        .select({ email: users.email, role: users.role })
        .from(users)
        .where(inArray(users.email, emails));

    console.log("\nFound users:", existingUsers.length);
    existingUsers.forEach(u => {
        console.log(`  - ${u.email} (current role: ${u.role || 'user'})`);
    });

    const existingEmails = existingUsers.map(u => u.email);
    const missingEmails = emails.filter(e => !existingEmails.includes(e));

    if (missingEmails.length > 0) {
        console.log("\n⚠️  Not found (need to sign up first):");
        missingEmails.forEach(e => console.log(`  - ${e}`));
    }

    if (existingEmails.length === 0) {
        console.log("\n❌ No matching users found. They need to sign up first.");
        process.exit(1);
    }

    // Grant admin to existing users
    const result = await db
        .update(users)
        .set({ role: "admin" })
        .where(inArray(users.email, existingEmails));

    console.log("\n✅ Admin granted to", existingEmails.length, "user(s)");

    // Verify
    const updatedUsers = await db
        .select({ email: users.email, role: users.role })
        .from(users)
        .where(eq(users.role, "admin"));

    console.log("\n📋 Current admins:");
    updatedUsers.forEach(u => console.log(`  - ${u.email}`));

    process.exit(0);
}

// Get emails from command line args
const emails = process.argv.slice(2).map(e => e.toLowerCase().trim());
grantAdmin(emails);
