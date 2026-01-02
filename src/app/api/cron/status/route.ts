import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Cron Status/Health Check Endpoint
 * 
 * Returns the status of cron-managed data:
 * - Last daily reset timestamp
 * - Active account counts by phase
 * - Accounts approaching inactivity threshold
 */

export async function GET(request: NextRequest) {
    // Optional auth for detailed stats
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}`;

    try {
        // Get all active challenges
        const activeChallenges = await db.select()
            .from(challenges)
            .where(eq(challenges.status, "active"));

        // Count by phase
        const challengePhase = activeChallenges.filter(c => c.phase === "challenge").length;
        const verificationPhase = activeChallenges.filter(c => c.phase === "verification").length;
        const fundedPhase = activeChallenges.filter(c => c.phase === "funded").length;

        // Get last reset timestamp
        const lastResetDates = activeChallenges
            .map(c => c.lastDailyResetAt)
            .filter(Boolean)
            .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0));

        const lastDailyReset = lastResetDates[0] || null;

        // Count funded accounts approaching inactivity (>20 days without activity)
        const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
        const approachingInactivity = activeChallenges.filter(c =>
            c.phase === "funded" &&
            c.lastActivityAt &&
            c.lastActivityAt < twentyDaysAgo
        ).length;

        const response = {
            status: "healthy",
            timestamp: new Date().toISOString(),
            stats: {
                activeAccounts: {
                    total: activeChallenges.length,
                    challenge: challengePhase,
                    verification: verificationPhase,
                    funded: fundedPhase
                },
                lastDailyReset: lastDailyReset?.toISOString() || null,
                fundedAccountsApproachingInactivity: approachingInactivity
            }
        };

        // Add detailed info only if authorized
        if (isAuthorized && approachingInactivity > 0) {
            const nearInactiveAccounts = activeChallenges
                .filter(c =>
                    c.phase === "funded" &&
                    c.lastActivityAt &&
                    c.lastActivityAt < twentyDaysAgo
                )
                .map(c => ({
                    id: c.id.slice(0, 8) + "...",
                    daysSinceActivity: Math.floor(
                        (Date.now() - (c.lastActivityAt?.getTime() || 0)) / (1000 * 60 * 60 * 24)
                    )
                }));

            (response as any).nearInactiveAccounts = nearInactiveAccounts;
        }

        return NextResponse.json(response);

    } catch (error) {
        console.error("[CronStatus] ❌ Error:", error);
        return NextResponse.json(
            {
                status: "error",
                error: "Failed to fetch cron status",
                details: String(error)
            },
            { status: 500 }
        );
    }
}
