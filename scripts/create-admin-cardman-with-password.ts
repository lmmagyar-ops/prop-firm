#!/usr/bin/env tsx
/**
 * Script to create admin user for Cardman with password
 * Usage: npx tsx scripts/create-admin-cardman-with-password.ts
 */

import 'dotenv/config';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const ADMIN_EMAIL = 'therealcardman@gmail.com';
const TEMP_PASSWORD = 'Admin123!'; // Temporary password - user should change this
const SALT_ROUNDS = 10;

async function createAdminWithPassword() {
    try {
        console.log(`🔍 Checking if user exists: ${ADMIN_EMAIL}`);

        // Hash the password
        const passwordHash = await bcrypt.hash(TEMP_PASSWORD, SALT_ROUNDS);

        // Check if user already exists
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, ADMIN_EMAIL))
            .limit(1);

        if (existingUser.length > 0) {
            console.log(`✅ User found! Updating role to admin and setting password...`);

            // Update existing user to admin with password
            await db
                .update(users)
                .set({
                    role: 'admin',
                    isActive: true,
                    passwordHash: passwordHash
                })
                .where(eq(users.email, ADMIN_EMAIL));

            console.log(`✅ Successfully updated ${ADMIN_EMAIL} to admin role with password!`);
        } else {
            console.log(`📝 User not found. Creating new admin user with password...`);

            // Create new admin user with password
            await db.insert(users).values({
                email: ADMIN_EMAIL,
                name: 'Cardman',
                role: 'admin',
                isActive: true,
                passwordHash: passwordHash,
                emailVerified: new Date(),
                createdAt: new Date(),
            });

            console.log(`✅ Successfully created admin user: ${ADMIN_EMAIL}`);
        }

        console.log(`\n🎉 Admin setup complete!`);
        console.log(`📧 Email: ${ADMIN_EMAIL}`);
        console.log(`🔑 Temporary Password: ${TEMP_PASSWORD}`);
        console.log(`⚠️  IMPORTANT: User should change this password after first login!`);
        console.log(`\n📝 Login instructions:`);
        console.log(`   1. Go to the login page`);
        console.log(`   2. Use email: ${ADMIN_EMAIL}`);
        console.log(`   3. Use password: ${TEMP_PASSWORD}`);
        console.log(`   4. Change password immediately in settings`);

    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

createAdminWithPassword();
