import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, challenges, businessRules, positions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
    try {
        // 1. Delete existing demo data
        await db.delete(positions).where(eq(positions.challengeId, "demo-user-1" as any));
        await db.delete(challenges).where(eq(challenges.userId, "demo-user-1"));
        await db.delete(users).where(eq(users.id, "demo-user-1"));
        await db.delete(businessRules).where(eq(businessRules.key, "challenge_config"));

        // 2. Seed business rules
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
        });

        // 3. Create demo user
        await db.insert(users).values({
            id: "demo-user-1",
            email: "demo@propfirm.com",
            name: "Demo Trader",
            displayName: "Demo Trader",
            country: "United States"
        });

        // 4. Create active challenge with ALL required fields
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
                profitTarget: 800,
                profit_target_percent: 0.08,
                maxDrawdown: 1000,
                max_drawdown_percent: 0.10,
                maxDailyDrawdown: 500,
                daily_loss_percent: 0.05,
                min_trades: 5,
                profit_split: 0.70,
                payout_frequency: "Monthly"
            },
            endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        return NextResponse.json({
            success: true,
            message: "Demo environment reset and recreated successfully!",
            note: "Visit /dashboard to see your demo account"
        });
    } catch (error: any) {
        console.error("Reset error:", error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
