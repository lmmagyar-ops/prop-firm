#!/usr/bin/env node
/**
 * Script to create admin user for Cardman
 * Usage: node scripts/create-admin-cardman.mjs
 */

import { db } from '../src/db/index.js';
import { users } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

const ADMIN_EMAIL = 'therealcardman@gmail.com';

async function createAdmin() {
    try {
        console.log(`🔍 Checking if user exists: ${ADMIN_EMAIL}`);

        // Check if user already exists
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, ADMIN_EMAIL))
            .limit(1);

        if (existingUser.length > 0) {
            console.log(`✅ User found! Updating role to admin...`);

            // Update existing user to admin
            await db
                .update(users)
                .set({
                    role: 'admin',
                    isActive: true
                })
                .where(eq(users.email, ADMIN_EMAIL));

            console.log(`✅ Successfully updated ${ADMIN_EMAIL} to admin role!`);
        } else {
            console.log(`📝 User not found. Creating new admin user...`);

            // Create new admin user
            await db.insert(users).values({
                email: ADMIN_EMAIL,
                name: 'Cardman',
                role: 'admin',
                isActive: true,
                emailVerified: new Date(),
                createdAt: new Date(),
            });

            console.log(`✅ Successfully created admin user: ${ADMIN_EMAIL}`);
        }

        console.log(`\n🎉 Admin setup complete!`);
        console.log(`📧 Admin email: ${ADMIN_EMAIL}`);
        console.log(`🔑 Role: admin`);

    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

createAdmin();
