import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, discountCodes, discountRedemptions } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import crypto from "crypto";
import { buildRulesConfig, getTierConfig } from "@/config/tiers";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ConfirmoWebhook");

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
                logger.error("[Confirmo] Invalid webhook signature");
                return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
            }
        } else if (process.env.NODE_ENV === "production") {
            logger.error("[Confirmo] CONFIRMO_CALLBACK_PASSWORD not configured!");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const payload = JSON.parse(bodyText);
        logger.info("[Confirmo Webhook] Received", { status: payload.status, reference: payload.reference });

        // Status: "paid", "confirmed", "complete"
        if (payload.status === "paid" || payload.status === "confirmed") {
            // Parse reference: userId:tier:platform[:discountCode:discountAmount:originalPrice]
            const refParts = payload.reference.split(":");
            const userId = refParts[0];
            const tier = refParts[1] || "10k"; // Default to 10k if not specified
            const platform = refParts[2] || "polymarket";
            const discountCode = refParts[3] || null;
            const discountAmount = refParts[4] ? parseFloat(refParts[4]) : 0;
            const originalPrice = refParts[5] ? parseFloat(refParts[5]) : 0;

            // Get tier-specific config from canonical source
            const tierConfig = getTierConfig(tier);
            const startingBalance = tierConfig.startingBalance;
            const rulesConfig = buildRulesConfig(tier);

            // Validate payment amount matches tier (derived from canonical PLANS config)
            const { PLANS } = await import("@/config/plans");
            const tierPrices: Record<string, number> = Object.fromEntries(
                Object.values(PLANS).map(p => [p.id, p.price])
            );
            const expectedPrice = tierPrices[tier];
            const paidAmount = parseFloat(payload.amount || "0");

            // Account for discount: if a discount was applied, expect the reduced price
            const effectiveExpectedPrice = discountCode && discountAmount > 0
                ? (originalPrice || expectedPrice) - discountAmount
                : expectedPrice;

            if (effectiveExpectedPrice && paidAmount < effectiveExpectedPrice * 0.95) { // 5% tolerance for fees
                logger.error("Payment mismatch", null, {
                    expected: effectiveExpectedPrice, paid: paidAmount, tier, discountCode,
                });
                return NextResponse.json(
                    { error: `Payment amount mismatch: expected $${effectiveExpectedPrice}, received $${paidAmount}` },
                    { status: 400 }
                );
            }

            // SINGLE-CHALLENGE GUARD: Skip creation if user already has an active challenge
            // (Fail-safe — checkout should gate this, but webhooks can arrive late)
            const activeChallenge = await db.query.challenges.findFirst({
                where: and(
                    eq(challenges.userId, userId),
                    eq(challenges.status, "active")
                )
            });

            if (activeChallenge) {
                logger.warn(`[Confirmo] ⚠️ User ${userId.slice(0, 8)} already has active challenge ${activeChallenge.id.slice(0, 8)}. Skipping creation. Payment was accepted but challenge creation blocked (single-challenge rule).`);
                return NextResponse.json({ received: true, skipped: true, reason: "active_challenge_exists" });
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
                logger.info(`[Confirmo] ⚠️ Duplicate webhook detected — challenge ${existingChallenge.id.slice(0, 8)} already exists for user ${userId.slice(0, 8)} (created ${existingChallenge.startedAt?.toISOString()}). Skipping.`);
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

            // DISCOUNT REDEMPTION: Redeem after payment confirmation (not before)
            // This prevents discount codes from being consumed when payment is abandoned.
            if (discountCode) {
                try {
                    // Find the discount code
                    const [discount] = await db
                        .select()
                        .from(discountCodes)
                        .where(eq(discountCodes.code, discountCode));

                    if (discount) {
                        // Record redemption
                        await db.insert(discountRedemptions).values({
                            discountCodeId: discount.id,
                            userId,
                            originalPrice: (originalPrice || expectedPrice).toString(),
                            discountAmount: discountAmount.toString(),
                            finalPrice: ((originalPrice || expectedPrice) - discountAmount).toString(),
                        });

                        // Increment usage counter
                        await db.update(discountCodes)
                            .set({ currentUses: sql`${discountCodes.currentUses} + 1` })
                            .where(eq(discountCodes.id, discount.id));

                        logger.info("Discount redeemed post-payment", {
                            code: discountCode, userId: userId.slice(0, 8), discountAmount,
                        });
                    } else {
                        logger.warn("Discount code not found during redemption", { code: discountCode });
                    }
                } catch (discountError) {
                    // Non-blocking: log but don't fail the webhook
                    logger.error("Discount redemption failed", discountError, { code: discountCode });
                }
            }

            // FORENSIC LOGGING: Track webhook-provisioned challenge
            logger.info("Challenge provisioned", {
                userId: userId.slice(0, 8),
                tier,
                startingBalance: `$${startingBalance}`,
                platform,
                paidAmount: `$${paidAmount}`,
                discountCode: discountCode || "none",
            });
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        logger.error("Webhook Error:", err);
        return NextResponse.json({ error: "Webhook Handler Failed" }, { status: 500 });
    }
}

