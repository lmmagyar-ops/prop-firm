import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { affiliateReferrals, affiliates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Track");

/**
 * GET /api/affiliate/track
 * Track affiliate referral click
 * Called when someone clicks an affiliate link or uses a referral code
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const refCode = searchParams.get("code");

        if (!refCode) {
            return NextResponse.json(
                { error: "No referral code provided" },
                { status: 400 }
            );
        }

        // Find the affiliate
        const affiliate = await db.query.affiliates.findFirst({
            where: and(
                eq(affiliates.referralCode, refCode.toUpperCase()),
                eq(affiliates.status, "active")
            )
        });

        if (!affiliate) {
            return NextResponse.json(
                { error: "Invalid or inactive referral code" },
                { status: 404 }
            );
        }

        // Get tracking data
        const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
        const userAgent = req.headers.get("user-agent") || "unknown";
        const referrerUrl = req.headers.get("referer") || null;

        // Create a tracking record (without userId initially)
        await db.insert(affiliateReferrals).values({
            affiliateId: affiliate.id,
            userId: null, // Will be updated when user signs up
            clickTimestamp: new Date(),
            signupTimestamp: null,
            purchaseTimestamp: null,
            source: "link",
            discountCodeId: null,
            purchaseAmount: null,
            commissionEarned: null,
            commissionPaid: false,
            payoutId: null,
            referrerUrl,
            ipAddress: ipAddress.substring(0, 45),
            userAgent: userAgent.substring(0, 255)
        });

        // Return success and set cookie for attribution
        const response = NextResponse.json({
            success: true,
            affiliateCode: refCode
        });

        // Set cookie for 30-day attribution window
        response.cookies.set('ref', refCode, {
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
            httpOnly: true,
            sameSite: 'lax'
        });

        return response;

    } catch (error: unknown) {
        logger.error("[Affiliate Track Error]:", error);
        return NextResponse.json(
            { error: "Failed to track referral" },
            { status: 500 }
        );
    }
}
