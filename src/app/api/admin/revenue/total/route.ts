import { NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { getTierPrice } from "@/lib/admin-utils";

/**
 * GET /api/admin/revenue/total
 * Returns total revenue from completed challenge purchases
 * 
 * Revenue is calculated from the startingBalance field of challenges,
 * which represents the tier price paid (5k->$79, 10k->$149, 25k->$299)
 */
export async function GET() {
    // SECURITY: Verify admin access
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        // Get current date boundaries
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get all challenges
        const allChallenges = await db.select({
            startingBalance: challenges.startingBalance,
            startedAt: challenges.startedAt,
        }).from(challenges);

        let total = 0;
        let today = 0;
        let thisWeek = 0;
        let thisMonth = 0;
        const totalChallenges = allChallenges.length;

        for (const challenge of allChallenges) {
            const price = getTierPrice(challenge.startingBalance);
            total += price;

            if (challenge.startedAt) {
                const startedDate = new Date(challenge.startedAt);
                if (startedDate >= startOfToday) {
                    today += price;
                }
                if (startedDate >= startOfWeek) {
                    thisWeek += price;
                }
                if (startedDate >= startOfMonth) {
                    thisMonth += price;
                }
            }
        }

        return NextResponse.json({
            total,
            today,
            thisWeek,
            thisMonth,
            totalChallenges,
        });
    } catch (error) {
        console.error("[Revenue API Error]:", error);
        return NextResponse.json(
            { error: "Failed to fetch revenue data" },
            { status: 500 }
        );
    }
}
