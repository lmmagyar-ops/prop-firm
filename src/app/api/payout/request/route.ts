import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PayoutService } from "@/lib/payout-service";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/payout/request
 * 
 * Creates a pending payout request for a funded account.
 * Body: { challengeId, walletAddress, network? }
 */
export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { challengeId, walletAddress, network = "POLYGON" } = body;

    if (!challengeId || !walletAddress) {
        return NextResponse.json({
            error: "challengeId and walletAddress are required"
        }, { status: 400 });
    }

    // Validate network
    const validNetworks = ["ERC20", "POLYGON", "SOLANA"];
    if (!validNetworks.includes(network)) {
        return NextResponse.json({
            error: `Invalid network. Must be one of: ${validNetworks.join(", ")}`
        }, { status: 400 });
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
        const payoutRequest = await PayoutService.requestPayout(
            challengeId,
            walletAddress,
            network as "ERC20" | "POLYGON" | "SOLANA"
        );

        return NextResponse.json({
            success: true,
            payout: payoutRequest,
            message: "Payout request submitted. Pending admin approval."
        });
    } catch (error) {
        console.error("[PayoutRequest] Error:", error);
        return NextResponse.json({
            error: "Failed to request payout"
        }, { status: 400 });
    }
}
