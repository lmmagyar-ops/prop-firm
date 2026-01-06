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
            const userId = payload.reference;

            // Create Challenge
            await db.insert(challenges).values({
                userId,
                phase: "challenge",
                status: "pending", // Pending activation (user clicks "Start")
                startingBalance: "10000.00",
                currentBalance: "10000.00",
                rulesConfig: {
                    profitTarget: 1000, // Dynamic based on tier later
                    maxDrawdown: 800,
                    dailyLossLimit: 400,
                    durationDays: 30
                }
            });

            console.log(`[Confirmo] Challenge provisioned for ${userId}`);
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error("Webhook Error:", err);
        return NextResponse.json({ error: "Webhook Handler Failed" }, { status: 500 });
    }
}
