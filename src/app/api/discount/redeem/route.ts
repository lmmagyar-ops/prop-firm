import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { discountCodes, discountRedemptions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

/**
 * Patterns that identify test/demo discount codes
 * These should NEVER work in production
 */
const TEST_CODE_PATTERNS = [
    /^TEST/i,
    /^DEMO/i,
    /^DEV/i,
    /^STAGING/i,
    /^FAKE/i,
    /^DUMMY/i,
    /^SAMPLE/i,
    /^XXX/i,
    /^PLACEHOLDER/i,
    /^DEBUG/i,
];

function isTestCode(code: string): boolean {
    return TEST_CODE_PATTERNS.some(pattern => pattern.test(code));
}

/**
 * POST /api/discount/redeem
 * Redeems a discount code and records the redemption
 * This should be called during checkout/payment processing
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "You must be logged in to redeem a discount" },
                { status: 401 }
            );
        }

        const userId = session.user.id;
        const { code, challengeId, originalPrice, finalPrice, discountAmount } = await req.json();

        if (!code || !originalPrice || finalPrice === undefined || discountAmount === undefined) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const normalizedCode = code.toUpperCase().trim();

        // SECURITY: Block test codes in production
        if (process.env.NODE_ENV === 'production' && isTestCode(normalizedCode)) {
            console.warn(`[Security] Blocked test code redemption attempt: ${normalizedCode} by user ${userId}`);
            return NextResponse.json(
                { error: "Invalid discount code" },
                { status: 400 }
            );
        }

        // SECURITY: Validate discount amount is reasonable (prevent client-side manipulation)
        if (discountAmount < 0 || discountAmount > originalPrice) {
            console.warn(`[Security] Invalid discount amount: ${discountAmount} (original: ${originalPrice}) by user ${userId}`);
            return NextResponse.json(
                { error: "Invalid discount calculation" },
                { status: 400 }
            );
        }

        // SECURITY: Validate final price matches
        const expectedFinalPrice = Math.max(0, originalPrice - discountAmount);
        if (Math.abs(finalPrice - expectedFinalPrice) > 0.01) {
            console.warn(`[Security] Price mismatch: got ${finalPrice}, expected ${expectedFinalPrice} by user ${userId}`);
            return NextResponse.json(
                { error: "Price validation failed" },
                { status: 400 }
            );
        }

        // Find the discount code
        const discount = await db.query.discountCodes.findFirst({
            where: eq(discountCodes.code, normalizedCode)
        });

        if (!discount) {
            return NextResponse.json(
                { error: "Invalid discount code" },
                { status: 400 }
            );
        }

        // Double-check validation (redundant but safe)
        if (!discount.active) {
            return NextResponse.json(
                { error: "This discount code is no longer active" },
                { status: 400 }
            );
        }

        const now = new Date();
        const validFrom = new Date(discount.validFrom);
        const validUntil = discount.validUntil ? new Date(discount.validUntil) : null;

        if (now < validFrom || (validUntil && now > validUntil)) {
            return NextResponse.json(
                { error: "This discount code is not valid at this time" },
                { status: 400 }
            );
        }

        // Check for duplicate redemption (prevent race conditions)
        if (challengeId) {
            const existingRedemption = await db.query.discountRedemptions.findFirst({
                where: and(
                    eq(discountRedemptions.discountCodeId, discount.id),
                    eq(discountRedemptions.userId, userId),
                    eq(discountRedemptions.challengeId, challengeId)
                )
            });

            if (existingRedemption) {
                return NextResponse.json(
                    { error: "This discount has already been applied to this purchase" },
                    { status: 400 }
                );
            }
        }

        // Get client IP and user agent for fraud tracking
        const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
        const userAgent = req.headers.get("user-agent") || "unknown";

        // Record the redemption
        await db.insert(discountRedemptions).values({
            discountCodeId: discount.id,
            userId,
            challengeId: challengeId || null,
            originalPrice: originalPrice.toString(),
            discountAmount: discountAmount.toString(),
            finalPrice: finalPrice.toString(),
            ipAddress: ipAddress.substring(0, 45), // Limit to column size
            userAgent
        });

        // Increment usage counter
        await db
            .update(discountCodes)
            .set({
                currentUses: sql`${discountCodes.currentUses} + 1`,
                updatedAt: new Date()
            })
            .where(eq(discountCodes.id, discount.id));

        return NextResponse.json({
            success: true,
            redemption: {
                code: discount.code,
                discountAmount,
                finalPrice
            }
        });

    } catch (error: any) {
        console.error("[Discount Redemption Error]:", error);
        return NextResponse.json(
            { error: "Failed to redeem discount code" },
            { status: 500 }
        );
    }
}
