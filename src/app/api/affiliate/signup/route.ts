import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { affiliates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Signup");

/**
 * POST /api/affiliate/signup
 * Tier 1 self-serve affiliate signup (instant approval)
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "You must be logged in to become an affiliate" },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        // Check if user is already an affiliate
        const existing = await db.query.affiliates.findFirst({
            where: eq(affiliates.userId, userId)
        });

        if (existing) {
            return NextResponse.json(
                { error: "You are already registered as an affiliate" },
                { status: 400 }
            );
        }

        // Generate unique referral code
        const referralCode = `REF${randomBytes(4).toString('hex').toUpperCase()}`;
        const referralLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://yoursite.com'}/ref/${referralCode}`;

        // Create Tier 1 affiliate (auto-approved)
        const newAffiliate = await db.insert(affiliates).values({
            userId,
            tier: 1,
            status: "active", // Tier 1 is auto-approved
            commissionRate: "10.00", // 10% base rate for Tier 1
            lifetimeValueRate: "0.00", // No LTV bonus for Tier 1
            referralCode,
            referralLink,
            monthlyEarningCap: "500.00", // $500/month cap for Tier 1
            applicationData: null,
            approvedBy: null,
            approvedAt: new Date()
        }).returning();

        return NextResponse.json({
            success: true,
            affiliate: {
                id: newAffiliate[0].id,
                tier: 1,
                commissionRate: 10,
                referralCode: newAffiliate[0].referralCode,
                referralLink: newAffiliate[0].referralLink,
                monthlyEarningCap: 500
            }
        });

    } catch (error: unknown) {
        logger.error("[Affiliate Signup Error]:", error);
        return NextResponse.json(
            { error: "Failed to register as affiliate" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/affiliate/signup
 * Get current user's affiliate status
 */
export async function GET() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ isAffiliate: false });
        }

        const affiliate = await db.query.affiliates.findFirst({
            where: eq(affiliates.userId, session.user.id)
        });

        if (!affiliate) {
            return NextResponse.json({ isAffiliate: false });
        }

        return NextResponse.json({
            isAffiliate: true,
            affiliate: {
                id: affiliate.id,
                tier: affiliate.tier,
                status: affiliate.status,
                commissionRate: parseFloat(affiliate.commissionRate),
                referralCode: affiliate.referralCode,
                referralLink: affiliate.referralLink,
                monthlyEarningCap: affiliate.monthlyEarningCap ? parseFloat(affiliate.monthlyEarningCap) : null
            }
        });

    } catch (error: unknown) {
        logger.error("[Affiliate Status Error]:", error);
        return NextResponse.json(
            { error: "Failed to fetch affiliate status" },
            { status: 500 }
        );
    }
}
