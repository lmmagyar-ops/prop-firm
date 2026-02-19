import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getErrorMessage } from "@/lib/errors";
import { TIERS, buildRulesConfig } from "@/config/tiers";
import { PLANS } from "@/config/plans";
import { createLogger } from "@/lib/logger";
const logger = createLogger("CreateConfirmoInvoice");

export async function POST(req: NextRequest) {
    const session = await auth();
    // Allow demo users for now (or strictly require auth)
    const userId = session?.user?.id || "demo-user-1";

    try {
        const body = await req.json();
        const { tier, platform, discountCode, discountAmount } = body;
        const selectedPlatform = platform || "polymarket"; // Default to polymarket

        // SERVER-AUTHORITATIVE PRICING: Ignore any client-supplied price.
        // Derive the correct price from the canonical PLANS config.
        const planEntry = Object.values(PLANS).find(p => p.id === tier);
        if (!planEntry) {
            return NextResponse.json(
                { error: `Unknown tier: ${tier}. Valid tiers: ${Object.values(PLANS).map(p => p.id).join(", ")}` },
                { status: 400 }
            );
        }
        const price = planEntry.price;

        logger.info("[Checkout] Received platform from request:", platform);
        logger.info("[Checkout] Selected platform for storage:", selectedPlatform);

        // Create Confirmo invoice
        // MOCK FOR DEVELOPMENT: Return a fake invoice URL if no API key
        if (!process.env.CONFIRMO_API_KEY) {
            logger.info("[Confirmo] API Key missing, provisioning MOCK challenge + returning redirect");

            try {
                // 0. Ensure Demo User Exists (to satisfy Foreign Key)
                if (userId.startsWith("demo-user")) {
                    await db.insert(users).values({
                        id: userId,
                        email: "demo@example.com",
                        name: "Demo User",
                        username: userId,
                        emailVerified: new Date(),
                    }).onConflictDoNothing();
                }

                // 1. Block if user already has an active challenge (single-challenge enforcement)
                const activeCount = await db.select({ id: challenges.id })
                    .from(challenges)
                    .where(and(
                        eq(challenges.userId, userId),
                        eq(challenges.status, "active")
                    ));

                if (activeCount.length >= 1) {
                    logger.info(`[Confirmo Mock] Blocked: user ${userId.slice(0, 8)} already has active challenge ${activeCount[0].id.slice(0, 8)}`);
                    return NextResponse.json(
                        { error: "You already have an active evaluation. Complete or fail it before starting a new one." },
                        { status: 400 }
                    );
                }

                // 2. Validate tier and get starting balance from canonical config
                const tierConfig = TIERS[tier];
                if (!tierConfig) {
                    return NextResponse.json(
                        { error: `Unknown tier: ${tier}. Valid tiers: ${Object.keys(TIERS).join(", ")}` },
                        { status: 400 }
                    );
                }
                const startingBalance = tierConfig.startingBalance;
                const rulesConfig = buildRulesConfig(tier);

                // 3. Create the Active Challenge immediately (Simulating Webhook)
                await db.insert(challenges).values({
                    userId,
                    phase: "challenge",
                    status: "active", // Set to active immediately so dashboard works
                    startingBalance: startingBalance.toString(),
                    currentBalance: startingBalance.toString(),
                    startOfDayBalance: startingBalance.toString(),
                    highWaterMark: startingBalance.toString(),
                    rulesConfig,
                    platform: selectedPlatform,
                    startedAt: new Date(),
                    endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                });

                // 4. Build redirect URL using request headers (works on Vercel)
                const protocol = req.headers.get('x-forwarded-proto') || 'http';
                const host = req.headers.get('host') || 'localhost:3000';
                const baseUrl = `${protocol}://${host}`;

                return NextResponse.json({
                    invoiceUrl: `${baseUrl}/onboarding/setup?status=success&demomode=true`,
                    invoiceId: "inv-mock-123-456"
                });
            } catch (dbError: unknown) {
                logger.error("[Confirmo Mock] Database error:", dbError);
                // If DB fails, still return success but without creating challenge
                // This allows UI testing even if DB is down
                const protocol = req.headers.get('x-forwarded-proto') || 'http';
                const host = req.headers.get('host') || 'localhost:3000';
                const baseUrl = `${protocol}://${host}`;
                const dbErrorMessage = dbError instanceof Error ? dbError.message : JSON.stringify(dbError);

                return NextResponse.json({
                    invoiceUrl: `${baseUrl}/onboarding/setup?status=success&demomode=true&db_error=true&error_details=${encodeURIComponent(dbErrorMessage)}`,
                    invoiceId: "inv-mock-error"
                });
            }
        }

        // SINGLE-CHALLENGE GATE (production path): Block invoice creation if active challenge exists
        const existingActive = await db.select({ id: challenges.id })
            .from(challenges)
            .where(and(
                eq(challenges.userId, userId),
                eq(challenges.status, "active")
            ));

        if (existingActive.length >= 1) {
            logger.info(`[Confirmo] Blocked invoice creation: user ${userId.slice(0, 8)} already has active challenge`);
            return NextResponse.json(
                { error: "You already have an active evaluation. Complete or fail it before starting a new one." },
                { status: 400 }
            );
        }

        const response = await fetch("https://confirmo.net/api/v3/invoices", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.CONFIRMO_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                product: {
                    name: `Evaluation Challenge - ${tier}`,
                    description: "Phase 1: Trading Challenge. 30 Days.",
                },
                invoice: {
                    currency_from: "USD",
                    amount: price, // Server-authoritative: derived from PLANS config, NOT client input
                    currency_to: "USDC"
                },
                // Reference format: userId:tier:platform[:discountCode:discountAmount:originalPrice]
                // Discount fields appended only when a discount is applied
                reference: discountCode
                    ? `${userId}:${tier}:${selectedPlatform}:${discountCode}:${discountAmount || 0}:${price}`
                    : `${userId}:${tier}:${selectedPlatform}`,
                // Webhooks
                notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/confirmo`,
                return_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/setup?status=success`
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Confirmo Error: ${err}`);
        }

        const data = await response.json();

        return NextResponse.json({
            invoiceUrl: data.url,
            invoiceId: data.id
        });
    } catch (error: unknown) {
        logger.error("Confirmo invoice creation failed:", error);
        return NextResponse.json(
            { error: getErrorMessage(error) || "Failed to create invoice" },
            { status: 500 }
        );
    }
}
