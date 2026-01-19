import { db } from "@/db";
import { challenges, positions, trades } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * POST /api/admin/reset-challenge
 * Resets a challenge to its initial state for testing purposes.
 * - Deletes all positions and trades
 * - Resets balance to starting balance
 * - Resets status to 'active'
 * - Clears high water mark
 */
export async function POST(req: Request) {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const { challengeId } = await req.json();

        if (!challengeId) {
            return NextResponse.json({ error: "challengeId is required" }, { status: 400 });
        }

        // 1. Get the challenge to find starting balance
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId));

        if (!challenge) {
            return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
        }

        const rulesConfig = challenge.rulesConfig as any;
        const startingBalance = rulesConfig?.startingBalance || 10000;

        // 2. Delete all trades for this challenge
        await db.delete(trades).where(eq(trades.challengeId, challengeId));

        // 3. Delete all positions for this challenge
        await db.delete(positions).where(eq(positions.challengeId, challengeId));

        // 4. Reset challenge state
        await db
            .update(challenges)
            .set({
                currentBalance: String(startingBalance),
                startOfDayBalance: String(startingBalance),
                highWaterMark: String(startingBalance),
                status: "active",
            })
            .where(eq(challenges.id, challengeId));

        // FORENSIC LOGGING: Track admin reset
        console.log(`[BALANCE_FORENSIC] ${JSON.stringify({
            timestamp: new Date().toISOString(),
            operation: 'ADMIN_RESET',
            challengeId: challengeId.slice(0, 8),
            newBalance: `$${startingBalance}`,
            source: 'admin/reset-challenge'
        })}`);

        return NextResponse.json({
            success: true,
            message: `Challenge reset successfully`,
            data: {
                challengeId,
                newBalance: startingBalance,
                status: "active"
            }
        });

    } catch (error) {
        console.error("Reset Challenge Error:", error);
        return NextResponse.json({ error: "Failed to reset challenge" }, { status: 500 });
    }
}

/**
 * GET /api/admin/reset-challenge
 * Lists all challenges available for reset
 */
export async function GET() {
    const { isAuthorized, response } = await requireAdmin();
    if (!isAuthorized) return response;

    try {
        const allChallenges = await db
            .select({
                id: challenges.id,
                status: challenges.status,
                currentBalance: challenges.currentBalance,
                userId: challenges.userId,
                platform: challenges.platform,
                phase: challenges.phase,
            })
            .from(challenges);

        return NextResponse.json({ challenges: allChallenges });
    } catch (error) {
        console.error("Get Challenges Error:", error);
        return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 });
    }
}
