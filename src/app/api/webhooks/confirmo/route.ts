import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import crypto from "crypto";

export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text();
        // Confirmo sends signature in header 'confirmo-signature'
        const signature = req.headers.get("confirmo-signature");

        /* 
           TODO: Verify signature in Prod
           const expectedSignature = crypto
             .createHmac("sha256", process.env.CONFIRMO_Callback_Password!)
             .update(bodyText)
             .digest("hex");
        */

        const payload = JSON.parse(bodyText);
        console.log("[Confirmo Webhook] Received:", payload.status, payload.reference);

        // Status: "paid", "confirmed", "complete"
        if (payload.status === "paid" || payload.status === "confirmed") {
            const userId = payload.reference;

            // Create Challenge
            // Using logic similar to our 'challenges.ts' action but server-side

            // 1. Check if user already has active pending challenge? 
            // For now, simpler: Just create it.

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
                // startedAt is auto-set by defaultNow() in schema
            });

            console.log(`[Confirmo] Challenge provisioned for ${userId}`);
        }

        return NextResponse.json({ received: true });
    } catch (err) {
        console.error("Webhook Error:", err);
        return NextResponse.json({ error: "Webhook Handler Failed" }, { status: 500 });
    }
}
