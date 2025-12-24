import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, challenges, businessRules } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET() {
    try {
        // 1. Seed business rules
        await db.insert(businessRules).values({
            key: "challenge_config",
            description: "Configuration for all challenge tiers",
            value: {
                "10k": {
                    challenge_fees: 99,
                    profit_target_percent: 0.08,
                    duration_days: 30,
                    max_drawdown_percent: 0.10,
                    daily_loss_percent: 0.05,
                    min_trades: 5,
                    profit_split: 0.70,
                    payout_frequency: "Monthly"
                },
                "25k": {
                    challenge_fees: 199,
                    profit_target_percent: 0.08,
                    duration_days: 30,
                    max_drawdown_percent: 0.10,
                    daily_loss_percent: 0.05,
                    min_trades: 5,
                    profit_split: 0.70,
                    payout_frequency: "Monthly"
                }
            },
            version: 1
        }).onConflictDoNothing();

        // 2. Create demo user
        const [user] = await db.insert(users).values({
            id: "demo-user-1",
            email: "demo@propfirm.com",
            name: "Demo Trader",
            displayName: "Demo Trader",
            country: "United States"
        }).onConflictDoNothing().returning();

        // 3. Create active challenge for demo user
        await db.insert(challenges).values({
            userId: "demo-user-1",
            phase: "challenge",
            status: "active",
            startingBalance: "10000.00",
            currentBalance: "10500.00",
            startOfDayBalance: "10000.00",
            highWaterMark: "10500.00",
            rulesConfig: {
                startingBalance: 10000,
                profit_target_percent: 0.08,
                max_drawdown_percent: 0.10,
                daily_loss_percent: 0.05,
                min_trades: 5,
                profit_split: 0.70,
                payout_frequency: "Monthly"
            },
            endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        }).onConflictDoNothing();

        return NextResponse.json({
            success: true,
            message: "Demo environment setup complete!",
            credentials: {
                note: "Authentication is disabled - just visit /dashboard",
                userId: "demo-user-1"
            }
        });
    } catch (error: any) {
        console.error("Setup error:", error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
