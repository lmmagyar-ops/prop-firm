import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { challenges, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
    const session = await auth();
    // Allow demo users for now (or strictly require auth)
    const userId = session?.user?.id || "demo-user-1";

    try {
        const body = await req.json();
        const { tier, price, platform } = body;
        const selectedPlatform = platform || "polymarket"; // Default to polymarket

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

                // 2. Determine starting balance from tier
                const tierBalances: Record<string, number> = {
                    "5k": 5000,
                    "10k": 10000,
                    "25k": 25000,
                    "50k": 50000,
                    "100k": 100000,
                    "200k": 200000
                };

                const startingBalance = tierBalances[tier] || 10000; // Default to 10k if tier not found

                // 3. Create the Active Challenge immediately (Simulating Webhook)
                await db.insert(challenges).values({
                    userId,
                    phase: "challenge",
                    status: "active", // Set to active immediately so dashboard works
                    startingBalance: startingBalance.toString(),
                    currentBalance: startingBalance.toString(),
                    startOfDayBalance: startingBalance.toString(),
                    highWaterMark: startingBalance.toString(),
                    rulesConfig: {
                        // CRITICAL: profitTarget and maxDrawdown must be ABSOLUTE DOLLAR VALUES
                        // Evaluator compares: equity >= startingBalance + profitTarget
                        profitTarget: startingBalance * 0.10, // 10% in absolute $
                        maxDrawdown: startingBalance * 0.08, // 8% in absolute $
                        maxTotalDrawdownPercent: 0.08, // 8% (kept as percent for display)
                        maxDailyDrawdownPercent: 0.04, // 4%

                        // Position Sizing
                        maxPositionSizePercent: 0.05, // 5% per market
                        maxCategoryExposurePercent: 0.10, // 10% per category
                        lowVolumeThreshold: 10_000_000, // $10M
                        lowVolumeMaxPositionPercent: 0.025, // 2.5%

                        // Liquidity
                        maxVolumeImpactPercent: 0.10, // 10% of 24h volume
                        minMarketVolume: 100_000, // $100k
                    },
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
                    amount: price,
                    currency_to: "USDC" // Force USDC for simplicity? Or allow user choice on Confirmo
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
    } catch (error: any) {
        console.error("Confirmo invoice creation failed:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create invoice" },
            { status: 500 }
        );
    }
}
