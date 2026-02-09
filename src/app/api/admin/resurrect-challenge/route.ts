import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { normalizeRulesConfig } from "@/lib/normalize-rules";

/**
 * Admin API: Resurrect a falsely-failed challenge
 * 
 * When a challenge fails due to corrupt rulesConfig (maxDrawdown stored as 0.08
 * instead of $800), this endpoint restores it to active status and fixes the
 * underlying corrupt rules.
 * 
 * POST /api/admin/resurrect-challenge
 * Body: { challengeId: string }
 */
export async function POST(req: NextRequest) {
    const authResult = await requireAdmin();
    if (!authResult.isAuthorized) {
        return authResult.response;
    }
    const admin = authResult.user;

    try {
        const body = await req.json();
        const { challengeId } = body;

        if (!challengeId) {
            return NextResponse.json(
                { error: "challengeId is required" },
                { status: 400 }
            );
        }

        // Fetch the challenge
        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.id, challengeId),
        });

        if (!challenge) {
            return NextResponse.json(
                { error: "Challenge not found" },
                { status: 404 }
            );
        }

        if (challenge.status !== "failed") {
            return NextResponse.json(
                { error: `Challenge status is "${challenge.status}", not "failed". No resurrection needed.` },
                { status: 400 }
            );
        }

        // Check and fix corrupt rulesConfig
        const rules = (challenge.rulesConfig as Record<string, unknown>) || {};
        const startingBalance = parseFloat(challenge.startingBalance);
        const normalized = normalizeRulesConfig(rules, startingBalance);

        const wasCorrupt =
            (rules.maxDrawdown != null && (rules.maxDrawdown as number) < 1) ||
            (rules.profitTarget != null && (rules.profitTarget as number) < 1);

        // Build fixed rulesConfig
        const fixedRules = {
            ...rules,
            maxDrawdown: normalized.maxDrawdown,
            profitTarget: normalized.profitTarget,
        };

        // Resurrect: set status back to active, fix rules
        await db.update(challenges)
            .set({
                status: "active",
                rulesConfig: fixedRules,
            })
            .where(eq(challenges.id, challengeId));

        // Audit log for traceability
        await db.insert(auditLogs).values({
            action: "RESURRECT_CHALLENGE",
            adminId: admin!.id,
            details: {
                challengeId,
                userId: challenge.userId,
                wasCorrupt,
                previousMaxDrawdown: rules.maxDrawdown,
                fixedMaxDrawdown: normalized.maxDrawdown,
                previousProfitTarget: rules.profitTarget,
                fixedProfitTarget: normalized.profitTarget,
                startingBalance,
            },
        });

        console.log(`[Admin] ✅ Resurrected challenge ${challengeId.slice(0, 8)} ` +
            `(corrupt=${wasCorrupt}, maxDrawdown: ${rules.maxDrawdown} → ${normalized.maxDrawdown})`);

        return NextResponse.json({
            success: true,
            challengeId,
            wasCorrupt,
            fixes: {
                maxDrawdown: { before: rules.maxDrawdown, after: normalized.maxDrawdown },
                profitTarget: { before: rules.profitTarget, after: normalized.profitTarget },
            },
        });

    } catch (err) {
        console.error("[Admin] Resurrect challenge error:", err);
        return NextResponse.json(
            { error: "Failed to resurrect challenge" },
            { status: 500 }
        );
    }
}
