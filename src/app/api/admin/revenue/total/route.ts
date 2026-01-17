import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, users } from "@/db/schema";
import { eq, sql, and, gte, lt } from "drizzle-orm";

/**
 * GET /api/admin/revenue/total
 * Returns total revenue from completed challenge purchases
 * 
 * Revenue is calculated from the startingBalance field of challenges,
 * which represents the tier price paid (5k->$79, 10k->$149, 25k->$299)
 */
export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { role: true }
    });

    if (user?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        // Get current date boundaries
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Map tier starting balance to actual purchase price
        // (startingBalance is the virtual balance, but we need the actual purchase price)
        const tierPrices: Record<string, number> = {
            "5000": 79,
            "5000.00": 79,
            "10000": 149,
            "10000.00": 149,
            "25000": 299,
            "25000.00": 299,
        };

        // Get all challenges
        const allChallenges = await db.select({
            startingBalance: challenges.startingBalance,
            startedAt: challenges.startedAt,
        }).from(challenges);

        let total = 0;
        let today = 0;
        let thisWeek = 0;
        let thisMonth = 0;
        let totalChallenges = allChallenges.length;

        for (const challenge of allChallenges) {
            const price = tierPrices[challenge.startingBalance] || 0;
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
