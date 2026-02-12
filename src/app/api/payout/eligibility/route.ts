import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PayoutService } from "@/lib/payout-service";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Eligibility");

/**
 * GET /api/payout/eligibility?challengeId=xxx
 * 
 * Returns payout eligibility status and calculation for a funded account.
 */
export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const challengeId = searchParams.get("challengeId");

    if (!challengeId) {
        return NextResponse.json({ error: "challengeId is required" }, { status: 400 });
    }

    // Verify ownership
    const [challenge] = await db
        .select()
        .from(challenges)
        .where(and(
            eq(challenges.id, challengeId),
            eq(challenges.userId, session.user.id)
        ));

    if (!challenge) {
        return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (challenge.phase !== "funded") {
        return NextResponse.json({
            error: "Only funded accounts can request payouts",
            phase: challenge.phase
        }, { status: 400 });
    }

    try {
        // Get eligibility
        const eligibility = await PayoutService.checkEligibility(challengeId);

        // Get calculation (even if not eligible, for transparency)
        let calculation = null;
        if (eligibility.netProfit > 0) {
            calculation = await PayoutService.calculatePayout(challengeId);
        }

        return NextResponse.json({
            challengeId,
            phase: challenge.phase,
            status: challenge.status,
            eligibility,
            calculation,
        });
    } catch (error) {
        logger.error("[PayoutEligibility] Error:", error);
        return NextResponse.json({
            error: "Failed to check eligibility"
        }, { status: 500 });
    }
}
