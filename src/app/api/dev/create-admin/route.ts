import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

/**
 * TEMPORARY: Add missing columns and create admin user
 * DELETE THIS FILE AFTER USE
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (secret !== "propshot-admin-2026") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const steps: string[] = [];

    try {
        // Step 1: Add missing columns
        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
            steps.push("Added password_hash column");
        } catch (e: any) { steps.push(`password_hash: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user'`);
            steps.push("Added role column");
        } catch (e: any) { steps.push(`role: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`);
            steps.push("Added is_active column");
        } catch (e: any) { steps.push(`is_active: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS agreed_to_terms_at TIMESTAMP`);
            steps.push("Added agreed_to_terms_at column");
        } catch (e: any) { steps.push(`agreed_to_terms_at: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_public BOOLEAN DEFAULT true`);
            steps.push("Added twitter_public column");
        } catch (e: any) { steps.push(`twitter_public: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_public BOOLEAN DEFAULT true`);
            steps.push("Added discord_public column");
        } catch (e: any) { steps.push(`discord_public: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_public BOOLEAN DEFAULT true`);
            steps.push("Added telegram_public column");
        } catch (e: any) { steps.push(`telegram_public: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_public BOOLEAN DEFAULT true`);
            steps.push("Added instagram_public column");
        } catch (e: any) { steps.push(`instagram_public: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS facebook_public BOOLEAN DEFAULT true`);
            steps.push("Added facebook_public column");
        } catch (e: any) { steps.push(`facebook_public: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS trading_bio TEXT`);
            steps.push("Added trading_bio column");
        } catch (e: any) { steps.push(`trading_bio: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS trading_style TEXT`);
            steps.push("Added trading_style column");
        } catch (e: any) { steps.push(`trading_style: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_markets TEXT`);
            steps.push("Added favorite_markets column");
        } catch (e: any) { steps.push(`favorite_markets: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_status BOOLEAN DEFAULT false`);
            steps.push("Added email_verified_status column");
        } catch (e: any) { steps.push(`email_verified_status: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false`);
            steps.push("Added two_factor_enabled column");
        } catch (e: any) { steps.push(`two_factor_enabled: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS leaderboard_privacy VARCHAR(20) DEFAULT 'semi_private'`);
            steps.push("Added leaderboard_privacy column");
        } catch (e: any) { steps.push(`leaderboard_privacy: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS show_country BOOLEAN DEFAULT false`);
            steps.push("Added show_country column");
        } catch (e: any) { steps.push(`show_country: ${e.message}`); }

        try {
            await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS show_stats_publicly BOOLEAN DEFAULT true`);
            steps.push("Added show_stats_publicly column");
        } catch (e: any) { steps.push(`show_stats_publicly: ${e.message}`); }

        // Step 2: Create admin user
        const id = crypto.randomUUID();
        const email = "l.m.magyar@gmail.com";
        const password = "Propshot2026!";
        const passwordHash = await bcrypt.hash(password, 10);

        await db.execute(sql`
            INSERT INTO users (id, email, name, password_hash, role, is_active)
            VALUES (${id}, ${email}, 'Les Magyar', ${passwordHash}, 'admin', true)
        `);
        steps.push("Created admin user");

        return NextResponse.json({
            success: true,
            message: "Database fixed and admin created!",
            credentials: { email, password },
            steps
        });

    } catch (error: any) {
        return NextResponse.json({
            error: "Failed",
            message: error.message,
            completedSteps: steps
        }, { status: 500 });
    }
}
