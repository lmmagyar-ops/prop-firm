#!/usr/bin/env tsx
/**
 * Script to verify admin users
 * Usage: npx tsx scripts/verify-admins.ts
 */

import 'dotenv/config';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function verifyAdmins() {
    try {
        console.log('🔍 Fetching all admin users...\n');

        const adminUsers = await db
            .select({
                email: users.email,
                name: users.name,
                role: users.role,
                isActive: users.isActive,
                createdAt: users.createdAt
            })
            .from(users)
            .where(eq(users.role, 'admin'));

        if (adminUsers.length === 0) {
            console.log('❌ No admin users found!');
        } else {
            console.log(`✅ Found ${adminUsers.length} admin user(s):\n`);
            adminUsers.forEach((admin, index) => {
                console.log(`${index + 1}. ${admin.name || 'No name'}`);
                console.log(`   📧 Email: ${admin.email}`);
                console.log(`   🔑 Role: ${admin.role}`);
                console.log(`   ✓ Active: ${admin.isActive}`);
                console.log(`   📅 Created: ${admin.createdAt?.toISOString() || 'Unknown'}`);
                console.log('');
            });
        }

    } catch (error) {
        console.error('❌ Error fetching admins:', error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

verifyAdmins();
