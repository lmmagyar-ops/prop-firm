import { NextResponse } from "next/server";
import { db } from "@/db";
import { businessRules } from "@/db/schema";

export async function GET() {
    try {
        // Seed challenge configuration
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

        return NextResponse.json({
            success: true,
            message: "Business rules seeded successfully"
        });
    } catch (error: any) {
        console.error("Seed error:", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
