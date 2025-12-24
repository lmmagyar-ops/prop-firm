import { db } from "@/db";
import { challenges, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";

export async function GET() {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const activeChallenges = await db
            .select({
                id: challenges.id,
                userId: challenges.userId,
                name: users.name,
                email: users.email,
                currentBalance: challenges.currentBalance,
                rulesConfig: challenges.rulesConfig,
                status: challenges.status
            })
            .from(challenges)
            .innerJoin(users, eq(challenges.userId, users.id))
            .where(eq(challenges.status, "active"));

        const alerts = [];

        for (const challenge of activeChallenges) {
            const rules = challenge.rulesConfig as any;
            const startingBalance = Number(rules.startingBalance || 10000); // Default to 10k
            const currentBalance = Number(challenge.currentBalance);
            const maxDrawdownPercent = Number(rules.max_drawdown_percent || 10);

            const drawdownLimit = startingBalance * (1 - (maxDrawdownPercent / 100));
            const drawdownThreshold = startingBalance * (1 - ((maxDrawdownPercent - 2) / 100)); // Within 2% of limit

            // Alert 1: High Drawdown (Red)
            if (currentBalance <= drawdownThreshold) {
                const percentLeft = ((currentBalance - drawdownLimit) / startingBalance) * 100;
                alerts.push({
                    type: "HIGH_DRAWDOWN",
                    severity: "high",
                    traderName: challenge.name,
                    message: `Drawdown critical: ${percentLeft.toFixed(1)}% equity remaining before failure`,
                    challengeId: challenge.id
                });
            }

            // Alert 2: Idle Account (White) - Mock logic, ideally check last trade time
            // ...
        }

        return NextResponse.json({ alerts });

    } catch (error) {
        console.error("Risk Alerts Error:", error);
        return NextResponse.json({ error: "Failed to fetch risk alerts" }, { status: 500 });
    }
}
