import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import crypto from "crypto";
import { buildRulesConfig, getTierConfig } from "@/config/tiers";

/**
 * Verify Confirmo webhook signature using HMAC-SHA256
 * Uses constant-time comparison to prevent timing attacks
 */
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
    if (!signature) return false;

    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

    // Constant-time comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch {
        return false;
    }
}

export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text();
        const signature = req.headers.get("confirmo-signature");

        // Verify signature in production
        const callbackPassword = process.env.CONFIRMO_CALLBACK_PASSWORD;
        if (callbackPassword) {
            if (!verifySignature(bodyText, signature, callbackPassword)) {
                console.error("[Confirmo] Invalid webhook signature");
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }
        } else if (process.env.NODE_ENV === "production") {
            console.error("[Confirmo] CONFIRMO_CALLBACK_PASSWORD not configured!");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const payload = JSON.parse(bodyText);
        console.log("[Confirmo Webhook] Received:", payload.status, payload.reference);

        // Status: "paid", "confirmed", "complete"
        if (payload.status === "paid" || payload.status === "confirmed") {
            // Parse reference: userId:tier:platform (or fallback for legacy: just userId)
            const refParts = payload.reference.split(":");
            const userId = refParts[0];
            const tier = refParts[1] || "10k"; // Default to 10k if not specified
            const platform = refParts[2] || "polymarket";

            // Get tier-specific config from canonical source
            const tierConfig = getTierConfig(tier);
            const startingBalance = tierConfig.startingBalance;
            const rulesConfig = buildRulesConfig(tier);

            // Validate payment amount matches tier
            const tierPrices: Record<string, number> = {
                "5k": 79, "10k": 149, "25k": 349,
                "50k": 499, "100k": 799, "200k": 1499
            };
            const expectedPrice = tierPrices[tier];
            const paidAmount = parseFloat(payload.amount || "0");

            if (expectedPrice && paidAmount < expectedPrice * 0.95) { // 5% tolerance for fees
                console.error(`[Confirmo] Payment mismatch! Expected $${expectedPrice}, got $${paidAmount} for tier ${tier}`);
                // Still provision but log the discrepancy - don't block the user
                // In production, you might want to flag this for manual review
            }

            // IDEMPOTENCY GUARD: Prevent duplicate challenge creation from webhook retries
            // Check if a challenge already exists for this user that was recently created
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const existingChallenge = await db.query.challenges.findFirst({
                where: and(
                    eq(challenges.userId, userId),
                    eq(challenges.status, "pending"),
                    gte(challenges.startedAt, fiveMinutesAgo)
                )
            });

            if (existingChallenge) {
                console.log(`[Confirmo] ⚠️ Duplicate webhook detected — challenge ${existingChallenge.id.slice(0, 8)} already exists for user ${userId.slice(0, 8)} (created ${existingChallenge.startedAt?.toISOString()}). Skipping.`);
                return NextResponse.json({ received: true, deduplicated: true });
            }

            // Create Challenge with correct tier-based rules
            await db.insert(challenges).values({
                userId,
                phase: "challenge",
                status: "pending", // Pending activation (user clicks "Start")
                startingBalance: startingBalance.toString(),
                currentBalance: startingBalance.toString(),
                startOfDayBalance: startingBalance.toString(),
                highWaterMark: startingBalance.toString(),
                rulesConfig,
                platform,
            });

            // FORENSIC LOGGING: Track webhook-provisioned challenge
            console.log(`[BALANCE_FORENSIC] ${JSON.stringify({
                timestamp: new Date().toISOString(),
                operation: 'WEBHOOK_PROVISION',
                userId: userId.slice(0, 8),
                tier,
                startingBalance: `$${startingBalance}`,
                platform,
                paidAmount: `$${paidAmount}`,
                source: 'webhooks/confirmo'
            })}`);
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error("Webhook Error:", err);
        return NextResponse.json({ error: "Webhook Handler Failed" }, { status: 500 });
    }
}

