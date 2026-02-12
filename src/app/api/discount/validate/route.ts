import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { discountCodes, discountRedemptions, challenges } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Validate");

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
 * POST /api/discount/validate
 * Validates a discount code and returns calculated pricing
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        const { code, challengeSize } = await req.json();

        if (!code || !challengeSize) {
            return NextResponse.json(
                { error: "Missing required fields: code, challengeSize" },
                { status: 400 }
            );
        }

        const normalizedCode = code.toUpperCase().trim();

        // SECURITY: Block test codes in production
        if (process.env.NODE_ENV === 'production' && isTestCode(normalizedCode)) {
            logger.warn(`[Security] Blocked test code attempt: ${normalizedCode}`);
            return NextResponse.json({
                valid: false,
                error: "Invalid discount code"
            });
        }

        const userId = session?.user?.id;

        // Find the discount code
        const discount = await db.query.discountCodes.findFirst({
            where: eq(discountCodes.code, normalizedCode)
        });

        if (!discount) {
            return NextResponse.json({
                valid: false,
                error: "Invalid discount code"
            });
        }

        // Check if active
        if (!discount.active) {
            return NextResponse.json({
                valid: false,
                error: "This discount code is no longer active"
            });
        }

        // Check validity dates
        const now = new Date();
        const validFrom = new Date(discount.validFrom);
        const validUntil = discount.validUntil ? new Date(discount.validUntil) : null;

        if (now < validFrom) {
            return NextResponse.json({
                valid: false,
                error: "This discount code is not yet valid"
            });
        }

        if (validUntil && now > validUntil) {
            return NextResponse.json({
                valid: false,
                error: "This discount code has expired"
            });
        }

        // Check total usage limit
        if (discount.maxTotalUses && (discount.currentUses || 0) >= discount.maxTotalUses) {
            return NextResponse.json({
                valid: false,
                error: "This discount code has reached its usage limit"
            });
        }

        // Check per-user usage limit (if user is logged in)
        if (userId && discount.maxUsesPerUser) {
            const userRedemptions = await db
                .select({ count: sql<number>`count(*)` })
                .from(discountRedemptions)
                .where(
                    and(
                        eq(discountRedemptions.discountCodeId, discount.id),
                        eq(discountRedemptions.userId, userId)
                    )
                );

            const redemptionCount = Number(userRedemptions[0]?.count || 0);

            if (redemptionCount >= discount.maxUsesPerUser) {
                return NextResponse.json({
                    valid: false,
                    error: "You have already used this discount code"
                });
            }
        }

        // Check new customers only restriction
        if (discount.newCustomersOnly && userId) {
            // Check if user has any previous challenges
            const previousChallenges = await db
                .select({ count: sql<number>`count(*)` })
                .from(challenges)
                .where(eq(challenges.userId, userId));

            const challengeCount = Number(previousChallenges[0]?.count || 0);

            if (challengeCount > 0) {
                return NextResponse.json({
                    valid: false,
                    error: "This discount is only available to new customers"
                });
            }
        }

        // Check tier eligibility
        if (discount.eligibleTiers && Array.isArray(discount.eligibleTiers)) {
            const tierKey = `${challengeSize / 1000}k`; // e.g., "5k", "10k", "25k"
            if (!discount.eligibleTiers.includes(tierKey)) {
                return NextResponse.json({
                    valid: false,
                    error: `This discount is not available for the ${tierKey} challenge`
                });
            }
        }

        // Get price for challenge tier
        const TIER_PRICES: Record<number, number> = {
            5000: 99,
            10000: 299,
            25000: 599
        };

        const originalPrice = TIER_PRICES[challengeSize];

        if (!originalPrice) {
            return NextResponse.json(
                { error: "Invalid challenge size" },
                { status: 400 }
            );
        }

        // Check minimum purchase amount
        if (discount.minPurchaseAmount && originalPrice < parseFloat(discount.minPurchaseAmount)) {
            return NextResponse.json({
                valid: false,
                error: `This discount requires a minimum purchase of $${discount.minPurchaseAmount}`
            });
        }

        // Calculate discount amount
        let discountAmount = 0;
        const discountValue = parseFloat(discount.value);

        if (discount.type === "percentage") {
            discountAmount = (originalPrice * discountValue) / 100;
        } else if (discount.type === "fixed_amount") {
            discountAmount = Math.min(discountValue, originalPrice); // Can't discount more than price
        }

        const finalPrice = Math.max(0, originalPrice - discountAmount);

        return NextResponse.json({
            valid: true,
            discount: {
                code: discount.code,
                name: discount.name,
                type: discount.type,
                value: discountValue,
                originalPrice,
                discountAmount: Math.round(discountAmount * 100) / 100,
                finalPrice: Math.round(finalPrice * 100) / 100,
                savings: Math.round(discountAmount * 100) / 100
            }
        });

    } catch (error: unknown) {
        logger.error("[Discount Validation Error]:", error);
        return NextResponse.json(
            { error: "Failed to validate discount code" },
            { status: 500 }
        );
    }
}
