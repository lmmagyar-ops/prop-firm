import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * GET /api/admin/risk/exposure
 * Returns real-time risk metrics based on active challenge balances
 * 
 * Total Liability = Sum of all active challenge balances
 * VaR (Value at Risk) = 5% of total exposure (simplified model)
 * Hedged = Estimated portion covered by challenge fees
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
        // Get all active challenges with their balances
        const activeChallenges = await db.select({
            currentBalance: challenges.currentBalance,
            startingBalance: challenges.startingBalance,
            phase: challenges.phase,
            status: challenges.status,
        }).from(challenges).where(eq(challenges.status, "active"));

        // Calculate total liability (sum of all active challenge balances)
        let totalLiability = 0;
        let fundedExposure = 0;
        let challengeExposure = 0;
        let verificationExposure = 0;

        for (const challenge of activeChallenges) {
            const balance = parseFloat(challenge.currentBalance);
            totalLiability += balance;

            if (challenge.phase === "funded") {
                fundedExposure += balance;
            } else if (challenge.phase === "verification") {
                verificationExposure += balance;
            } else {
                challengeExposure += balance;
            }
        }

        // Value at Risk (5% of total exposure - simplified model)
        const valueAtRisk = totalLiability * 0.05;

        // Exposure cap (example: 2M exposure limit)
        const exposureCap = 2000000;
        const exposureUtilization = Math.round((totalLiability / exposureCap) * 100);

        // Hedged positions estimate (challenge fees collected provide some coverage)
        // Rough estimate: ~10% of liability is "hedged" through fees
        const hedgedAmount = totalLiability * 0.1;

        // Risk status determination
        let riskStatus: "low" | "medium" | "high" | "critical" = "low";
        if (exposureUtilization > 90) riskStatus = "critical";
        else if (exposureUtilization > 75) riskStatus = "high";
        else if (exposureUtilization > 50) riskStatus = "medium";

        return NextResponse.json({
            totalLiability,
            valueAtRisk,
            exposureUtilization,
            exposureCap,
            hedgedAmount,
            riskStatus,
            breakdown: {
                funded: fundedExposure,
                verification: verificationExposure,
                challenge: challengeExposure,
            },
            activeChallengeCount: activeChallenges.length,
        });
    } catch (error) {
        console.error("[Risk Exposure API Error]:", error);
        return NextResponse.json(
            { error: "Failed to fetch risk exposure data" },
            { status: 500 }
        );
    }
}
