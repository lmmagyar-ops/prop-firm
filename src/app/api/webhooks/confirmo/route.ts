import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, discountCodes, discountRedemptions, paymentLogs } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
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
        logger.info("[Confirmo Webhook] Received", { status: payload.status, reference: payload.reference, id: payload.id });

        // Status: "paid", "confirmed", "complete"
        if (payload.status === "paid" || payload.status === "confirmed") {
            // Parse reference: userId:tier:platform[:discountCode:discountAmount:originalPrice]
            // NOTE: discountAmount from reference is UNTRUSTED — always re-derive from DB.
            const refParts = payload.reference.split(":");
            const userId = refParts[0];
            const tier = refParts[1] || "10k"; // Default to 10k if not specified
            const platform = refParts[2] || "polymarket";
            const discountCode = refParts[3] || null;
            // refParts[4] (discountAmount) deliberately NOT used — re-derived from DB below.
            const originalPrice = refParts[5] ? parseFloat(refParts[5]) : 0;

            // Confirmo invoice ID — canonical idempotency key
            // If payload.id is absent (malformed), fall back so we don't crash, but log it.
            const confirmoInvoiceId: string = payload.id ?? `ref:${payload.reference}`;
            if (!payload.id) {
                logger.warn("[Confirmo] Webhook missing payload.id — using reference as fallback idempotency key");
            }

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

            // Bug 3 fix: Re-derive discountAmount from DB — NEVER trust the reference string value.
            // The reference is client-controlled at invoice creation time; we re-verify against the DB
            // to ensure we use the canonical discount value.
            let resolvedDiscountAmount = 0;
            if (discountCode) {
                const discountRecord = await db.query.discountCodes.findFirst({
                    where: eq(discountCodes.code, discountCode),
                });
                if (discountRecord) {
                    const discountValue = parseFloat(discountRecord.value);
                    if (discountRecord.type === "percentage") {
                        const base = originalPrice || expectedPrice;
                        resolvedDiscountAmount = (base * discountValue) / 100;
                    } else if (discountRecord.type === "fixed_amount") {
                        resolvedDiscountAmount = Math.min(discountValue, originalPrice || expectedPrice);
                    }
                    logger.info("[Confirmo] Discount re-derived from DB", {
                        code: discountCode,
                        type: discountRecord.type,
                        value: discountValue,
                        resolvedAmount: resolvedDiscountAmount,
                    });
                } else {
                    logger.warn("[Confirmo] Discount code in reference not found in DB — treating as no discount", { code: discountCode });
                }
            }

            // Account for discount: use DB-derived amount (not reference string)
            const effectiveExpectedPrice = resolvedDiscountAmount > 0
                ? (originalPrice || expectedPrice) - resolvedDiscountAmount
                : expectedPrice;

            if (effectiveExpectedPrice && paidAmount < effectiveExpectedPrice * 0.95) { // 5% tolerance for fees
                logger.error("Payment mismatch", null, {
                    expected: effectiveExpectedPrice, paid: paidAmount, tier, discountCode,
                });

                // Write rejected payment log for audit trail — even mismatches should be recorded
                try {
                    await db.insert(paymentLogs).values({
                        confirmoInvoiceId,
                        userId,
                        tier,
                        platform,
                        status: "rejected_underpayment",
                        amountPaid: paidAmount.toString(),
                        expectedAmount: effectiveExpectedPrice.toString(),
                        discountCode,
                        discountAmount: resolvedDiscountAmount > 0 ? resolvedDiscountAmount.toString() : null,
                        rawPayload: payload,
                    }).onConflictDoNothing();
                } catch (logErr) {
                    logger.error("[Confirmo] Failed to write rejection log", logErr);
                }

                return NextResponse.json(
                    { error: `Payment amount mismatch: expected $${effectiveExpectedPrice}, received $${paidAmount}` },
                    { status: 400 }
                );
            }

            // ─── IDEMPOTENCY GUARD (Bug 2 fix) ────────────────────────────────
            // Use confirmoInvoiceId as the canonical dedup key instead of the fragile
            // "pending status + 5-min window" approach. We attempt to INSERT into payment_logs
            // with ON CONFLICT DO NOTHING. If 0 rows are inserted, this event was already processed.
            const insertResult = await db.insert(paymentLogs).values({
                confirmoInvoiceId,
                userId,
                tier,
                platform,
                status: payload.status,
                amountPaid: paidAmount.toString(),
                expectedAmount: effectiveExpectedPrice.toString(),
                discountCode,
                discountAmount: resolvedDiscountAmount > 0 ? resolvedDiscountAmount.toString() : null,
                rawPayload: payload,
                // challengeId backfilled below after challenge creation
            }).onConflictDoNothing().returning({ id: paymentLogs.id });

            if (insertResult.length === 0) {
                logger.info(`[Confirmo] ⚠️ Duplicate webhook detected (invoice ${confirmoInvoiceId}/${payload.status}) — already processed, skipping.`);
                return NextResponse.json({ received: true, deduplicated: true });
            }

            const paymentLogId = insertResult[0].id;

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

            // Create Challenge with correct tier-based rules
            const [newChallenge] = await db.insert(challenges).values({
                userId,
                phase: "challenge",
                status: "pending", // Pending activation (user clicks "Start")
                startingBalance: startingBalance.toString(),
                currentBalance: startingBalance.toString(),
                startOfDayBalance: startingBalance.toString(),
                highWaterMark: startingBalance.toString(),
                rulesConfig,
                platform,
            }).returning({ id: challenges.id });

            // Backfill challengeId on the payment log now that we have it
            await db.update(paymentLogs)
                .set({ challengeId: newChallenge.id })
                .where(eq(paymentLogs.id, paymentLogId));

            // DISCOUNT REDEMPTION: Redeem after payment confirmation (not before)
            // This prevents discount codes from being consumed when payment is abandoned.
            if (discountCode && resolvedDiscountAmount > 0) {
                try {
                    // Find the discount code
                    const [discount] = await db
                        .select()
                        .from(discountCodes)
                        .where(eq(discountCodes.code, discountCode));

                    if (discount) {
                        // Record redemption with challengeId populated (Bug 5 fix)
                        await db.insert(discountRedemptions).values({
                            discountCodeId: discount.id,
                            userId,
                            challengeId: newChallenge.id, // Bug 5: was missing before
                            originalPrice: (originalPrice || expectedPrice).toString(),
                            discountAmount: resolvedDiscountAmount.toString(), // Bug 3: use DB-derived amount
                            finalPrice: ((originalPrice || expectedPrice) - resolvedDiscountAmount).toString(),
                        });

                        // Increment usage counter
                        await db.update(discountCodes)
                            .set({ currentUses: sql`${discountCodes.currentUses} + 1` })
                            .where(eq(discountCodes.id, discount.id));

                        logger.info("Discount redeemed post-payment", {
                            code: discountCode, userId: userId.slice(0, 8), resolvedDiscountAmount,
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
                challengeId: newChallenge.id.slice(0, 8),
                confirmoInvoiceId: confirmoInvoiceId.slice(0, 12),
            });
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        logger.error("Webhook Error:", err);
        return NextResponse.json({ error: "Webhook Handler Failed" }, { status: 500 });
    }
}
