import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import crypto from "crypto";

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

/**
 * Get rules config for a given tier
 * Matches the logic in create-confirmo-invoice
 */
function getRulesConfig(tier: string) {
    const tierBalances: Record<string, number> = {
        "5k": 5000, "10k": 10000, "25k": 25000,
        "50k": 50000, "100k": 100000, "200k": 200000
    };
    const startingBalance = tierBalances[tier] || 10000;

    return {
        startingBalance,
        rulesConfig: {
            // CRITICAL: profitTarget and maxDrawdown must be ABSOLUTE DOLLAR VALUES
            profitTarget: startingBalance * 0.10, // 10% in absolute $
            maxDrawdown: startingBalance * 0.08, // 8% in absolute $
            maxTotalDrawdownPercent: 0.08, // 8%
            maxDailyDrawdownPercent: 0.04, // 4%

            // Position Sizing
            maxPositionSizePercent: 0.05, // 5% per market
            maxCategoryExposurePercent: 0.10, // 10% per category
            lowVolumeThreshold: 10_000_000, // $10M
            lowVolumeMaxPositionPercent: 0.025, // 2.5%

            // Liquidity
            maxVolumeImpactPercent: 0.10, // 10% of 24h volume
            minMarketVolume: 100_000, // $100k
        }
    };
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

            // Get tier-specific config
            const { startingBalance, rulesConfig } = getRulesConfig(tier);

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

            console.log(`[Confirmo] Challenge provisioned for ${userId} (tier: ${tier}, platform: ${platform}, paid: $${paidAmount})`);
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error("Webhook Error:", err);
        return NextResponse.json({ error: "Webhook Handler Failed" }, { status: 500 });
    }
}

