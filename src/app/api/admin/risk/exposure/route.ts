import { NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { EXPOSURE_CAP, VAR_MULTIPLIER, HEDGE_RATIO } from "@/lib/admin-utils";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Exposure");

/**
 * GET /api/admin/risk/exposure
 * Returns real-time risk metrics based on active challenge balances
 * 
 * Total Liability = Sum of all active challenge balances
 * VaR (Value at Risk) = 5% of total exposure (simplified model)
 * Hedged = Estimated portion covered by challenge fees
 */
export async function GET() {
    // SECURITY: Verify admin access
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

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
        const valueAtRisk = totalLiability * VAR_MULTIPLIER;

        // Exposure utilization
        const exposureUtilization = Math.round((totalLiability / EXPOSURE_CAP) * 100);

        // Hedged positions estimate (challenge fees collected provide some coverage)
        const hedgedAmount = totalLiability * HEDGE_RATIO;

        // Risk status determination
        let riskStatus: "low" | "medium" | "high" | "critical" = "low";
        if (exposureUtilization > 90) riskStatus = "critical";
        else if (exposureUtilization > 75) riskStatus = "high";
        else if (exposureUtilization > 50) riskStatus = "medium";

        return NextResponse.json({
            totalLiability,
            valueAtRisk,
            exposureUtilization,
            exposureCap: EXPOSURE_CAP,
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
        logger.error("[Risk Exposure API Error]:", error);
        return NextResponse.json(
            { error: "Failed to fetch risk exposure data" },
            { status: 500 }
        );
    }
}
