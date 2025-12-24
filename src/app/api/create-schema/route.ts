import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
    try {
        // Create all tables using raw SQL
        await db.execute(sql`
            -- Users table (from NextAuth)
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
                show_on_leaderboard BOOLEAN DEFAULT false,
                twitter TEXT,
                discord TEXT,
                telegram TEXT,
                facebook TEXT,
                tiktok TEXT,
                instagram TEXT,
                youtube TEXT,
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
                address_country TEXT
            );

            -- Business rules table
            CREATE TABLE IF NOT EXISTS business_rules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                key TEXT UNIQUE NOT NULL,
                description TEXT,
                value JSONB NOT NULL,
                version INTEGER DEFAULT 1,
                updated_at TIMESTAMP DEFAULT NOW()
            );

            -- Challenges table
            CREATE TABLE IF NOT EXISTS challenges (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                phase VARCHAR(20) NOT NULL,
                status VARCHAR(20) NOT NULL,
                starting_balance DECIMAL(12,2) NOT NULL,
                start_of_day_balance DECIMAL(12,2) DEFAULT '10000.00',
                current_balance DECIMAL(12,2) NOT NULL,
                high_water_mark DECIMAL(12,2),
                rules_config JSONB NOT NULL,
                started_at TIMESTAMP DEFAULT NOW(),
                ends_at TIMESTAMP,
                is_public_on_profile BOOLEAN DEFAULT true,
                show_dropdown_on_profile BOOLEAN DEFAULT true
            );

            -- Positions table
            CREATE TABLE IF NOT EXISTS positions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
                market_id TEXT NOT NULL,
                direction VARCHAR(10) NOT NULL,
                size_amount DECIMAL(12,2) NOT NULL,
                shares DECIMAL(12,2) NOT NULL,
                entry_price DECIMAL(10,4) NOT NULL,
                current_price DECIMAL(10,4),
                status VARCHAR(20) DEFAULT 'OPEN',
                pnl DECIMAL(12,2) DEFAULT '0',
                last_fee_charged_at TIMESTAMP,
                fees_paid DECIMAL(12,2) DEFAULT '0',
                opened_at TIMESTAMP DEFAULT NOW(),
                closed_at TIMESTAMP
            );
        `);

        return NextResponse.json({
            success: true,
            message: "Database schema created successfully!"
        });
    } catch (error: any) {
        console.error("Schema creation error:", error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
