import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * TEMPORARY: Initialize database schema
 * DELETE THIS FILE AFTER USE
 * 
 * This creates the core tables needed for authentication.
 * Run once, then delete.
 * 
 * GET /api/dev/init-db?secret=propshot-admin-2026
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (secret !== "propshot-admin-2026") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: string[] = [];

    try {
        // Create users table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT,
                email TEXT NOT NULL,
                "emailVerified" TIMESTAMP,
                image TEXT,
                username TEXT UNIQUE,
                display_name TEXT,
                country TEXT,
                verification_code TEXT,
                verification_code_expiry TIMESTAMP,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                password_hash TEXT,
                role VARCHAR(20) DEFAULT 'user',
                is_active BOOLEAN DEFAULT true,
                agreed_to_terms_at TIMESTAMP,
                show_on_leaderboard BOOLEAN DEFAULT false,
                twitter TEXT,
                discord TEXT,
                telegram TEXT,
                facebook TEXT,
                tiktok TEXT,
                instagram TEXT,
                youtube TEXT,
                twitter_public BOOLEAN DEFAULT true,
                discord_public BOOLEAN DEFAULT true,
                telegram_public BOOLEAN DEFAULT true,
                instagram_public BOOLEAN DEFAULT true,
                facebook_public BOOLEAN DEFAULT true,
                trading_bio TEXT,
                trading_style TEXT,
                favorite_markets TEXT,
                first_name TEXT,
                last_name TEXT,
                kraken_id TEXT,
                kyc_status VARCHAR(20) DEFAULT 'not_started',
                kyc_approved_at TIMESTAMP,
                sumsub_applicant_id TEXT,
                address_street TEXT,
                address_apartment TEXT,
                address_city TEXT,
                address_state TEXT,
                address_zip TEXT,
                address_country TEXT,
                email_verified_status BOOLEAN DEFAULT false,
                two_factor_enabled BOOLEAN DEFAULT false,
                leaderboard_privacy VARCHAR(20) DEFAULT 'semi_private',
                show_country BOOLEAN DEFAULT false,
                show_stats_publicly BOOLEAN DEFAULT true
            )
        `);
        results.push("users table created");

        // Create account table for OAuth
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS account (
                "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                provider TEXT NOT NULL,
                "providerAccountId" TEXT NOT NULL,
                refresh_token TEXT,
                access_token TEXT,
                expires_at INTEGER,
                token_type TEXT,
                scope TEXT,
                id_token TEXT,
                session_state TEXT,
                PRIMARY KEY (provider, "providerAccountId")
            )
        `);
        results.push("account table created");

        // Create session table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS session (
                "sessionToken" TEXT PRIMARY KEY,
                "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires TIMESTAMP NOT NULL
            )
        `);
        results.push("session table created");

        // Create verification token table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "verificationToken" (
                identifier TEXT NOT NULL,
                token TEXT NOT NULL,
                expires TIMESTAMP NOT NULL,
                PRIMARY KEY (identifier, token)
            )
        `);
        results.push("verificationToken table created");

        // Create challenges table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS challenges (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                phase VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL,
                starting_balance DECIMAL(12,2) NOT NULL,
                start_of_day_balance DECIMAL(12,2) DEFAULT 10000.00,
                current_balance DECIMAL(12,2) NOT NULL,
                high_water_mark DECIMAL(12,2),
                rules_config JSONB NOT NULL,
                platform VARCHAR(20) NOT NULL DEFAULT 'polymarket',
                started_at TIMESTAMP DEFAULT NOW(),
                ends_at TIMESTAMP,
                pending_failure_at TIMESTAMP,
                last_daily_reset_at TIMESTAMP,
                is_public_on_profile BOOLEAN DEFAULT true,
                show_dropdown_on_profile BOOLEAN DEFAULT true,
                profit_split DECIMAL(4,2) DEFAULT 0.80,
                payout_cap DECIMAL(12,2),
                last_payout_at TIMESTAMP,
                total_paid_out DECIMAL(12,2) DEFAULT 0,
                active_trading_days INTEGER DEFAULT 0,
                consistency_flagged BOOLEAN DEFAULT false,
                last_activity_at TIMESTAMP,
                payout_cycle_start TIMESTAMP
            )
        `);
        results.push("challenges table created");

        return NextResponse.json({
            success: true,
            message: "Database tables created successfully!",
            results
        });
    } catch (error: any) {
        console.error("[init-db] Error:", error);
        return NextResponse.json({
            error: "Database error",
            message: error.message,
            completedSteps: results
        }, { status: 500 });
    }
}
