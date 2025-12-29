import { NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";

/**
 * API: Fix corrupted challenge rules
 * 
 * Background: A bug caused profitTarget to be stored as 0.10 (percentage)
 * instead of the correct absolute dollar value (e.g., $10,000 for a $100k account at 10%).
 * This caused challenges to incorrectly "pass" with ~$0.11 profit.
 */
export async function POST(req: Request) {
    try {
        const session = await auth();
        const userId = session?.user?.id || "demo-user-1";

        // Find user's active challenge
        const challenge = await db.query.challenges.findFirst({
            where: and(
                eq(challenges.userId, userId),
                eq(challenges.status, "active")
            )
        });

        if (!challenge) {
            return NextResponse.json({ error: "No active challenge found" }, { status: 404 });
        }

        const startingBalance = parseFloat(challenge.startingBalance);
        const rules = challenge.rulesConfig as any;

        // Check if rules are corrupted (profitTarget < 1 indicates it was stored as percentage)
        const isCorrupted = rules.profitTarget < 1 || rules.maxDrawdown < 1;

        if (!isCorrupted) {
            return NextResponse.json({
                success: true,
                message: "Challenge rules are already correct",
                challengeId: challenge.id,
                currentRules: {
                    profitTarget: rules.profitTarget,
                    maxDrawdown: rules.maxDrawdown
                }
            });
        }

        // Fix the rules by converting percentages to absolute dollar values
        const fixedRules = {
            ...rules,
            profitTarget: startingBalance * 0.10, // 10% of starting balance
            maxDrawdown: startingBalance * 0.08, // 8% of starting balance
        };

        // Update the challenge
        await db.update(challenges)
            .set({
                rulesConfig: fixedRules,
                // Also reset to active status if it was incorrectly marked as passed
                status: "active"
            })
            .where(eq(challenges.id, challenge.id));

        console.log(`[Fix Rules] Fixed challenge ${challenge.id} for user ${userId}`);
        console.log(`[Fix Rules] Starting Balance: $${startingBalance}`);
        console.log(`[Fix Rules] Fixed profitTarget: $${fixedRules.profitTarget}`);
        console.log(`[Fix Rules] Fixed maxDrawdown: $${fixedRules.maxDrawdown}`);

        return NextResponse.json({
            success: true,
            message: "Challenge rules fixed successfully!",
            challengeId: challenge.id,
            fixes: {
                startingBalance,
                profitTarget: {
                    before: rules.profitTarget,
                    after: fixedRules.profitTarget
                },
                maxDrawdown: {
                    before: rules.maxDrawdown,
                    after: fixedRules.maxDrawdown
                }
            }
        });
    } catch (error: any) {
        console.error("[Fix Rules] Error:", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

// Also allow GET for convenience
export async function GET(req: Request) {
    return POST(req);
}
