import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getErrorMessage } from "@/lib/errors";
import { TIERS, buildRulesConfig } from "@/config/tiers";
import { PLANS } from "@/config/plans";

export async function POST(req: NextRequest) {
    const session = await auth();
    // Allow demo users for now (or strictly require auth)
    const userId = session?.user?.id || "demo-user-1";

    try {
        const body = await req.json();
        const { tier, platform } = body;
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

        console.log("[Checkout] Received platform from request:", platform);
        console.log("[Checkout] Selected platform for storage:", selectedPlatform);

        // Create Confirmo invoice
        // MOCK FOR DEVELOPMENT: Return a fake invoice URL if no API key
        if (!process.env.CONFIRMO_API_KEY) {
            console.log("[Confirmo] API Key missing, provisioning MOCK challenge + returning redirect");

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

                // 1. Check active challenge count (max 5)
                const activeCount = await db.select({ id: challenges.id })
                    .from(challenges)
                    .where(and(
                        eq(challenges.userId, userId),
                        eq(challenges.status, "active")
                    ));

                if (activeCount.length >= 5) {
                    return NextResponse.json(
                        { error: "Maximum 5 active evaluations allowed. Complete or fail an existing one first." },
                        { status: 400 }
                    );
                }

                // 1b. Deactivate any existing active challenge to satisfy the unique constraint
                // (User explicitly chose a new tier, so the old one is superseded)
                if (activeCount.length > 0) {
                    console.log(`[Confirmo Mock] Deactivating ${activeCount.length} existing active challenge(s) for user ${userId}`);
                    await db.update(challenges)
                        .set({ status: "cancelled" })
                        .where(and(
                            eq(challenges.userId, userId),
                            eq(challenges.status, "active")
                        ));
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
            } catch (dbError: any) {
                console.error("[Confirmo Mock] Database error:", dbError);
                // If DB fails, still return success but without creating challenge
                // This allows UI testing even if DB is down
                const protocol = req.headers.get('x-forwarded-proto') || 'http';
                const host = req.headers.get('host') || 'localhost:3000';
                const baseUrl = `${protocol}://${host}`;

                return NextResponse.json({
                    invoiceUrl: `${baseUrl}/onboarding/setup?status=success&demomode=true&db_error=true&error_details=${encodeURIComponent(dbError.message || JSON.stringify(dbError))}`,
                    invoiceId: "inv-mock-error"
                });
            }
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
                // Reference format: userId:tier:platform (parsed by webhook)
                reference: `${userId}:${tier}:${selectedPlatform}`,
                // Webhooks
                notify_url: `${process.env.NEXTAUTH_URL}/api/webhooks/confirmo`,
                return_url: `${process.env.NEXTAUTH_URL}/onboarding/setup?status=success`
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
        console.error("Confirmo invoice creation failed:", error);
        return NextResponse.json(
            { error: getErrorMessage(error) || "Failed to create invoice" },
            { status: 500 }
        );
    }
}
