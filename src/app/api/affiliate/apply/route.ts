import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { affiliates } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/affiliate/apply
 * Tier 2 affiliate application (requires manual review)
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "You must be logged in to apply" },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        // Check if user is already an affiliate
        const existing = await db.query.affiliates.findFirst({
            where: eq(affiliates.userId, userId)
        });

        if (existing) {
            if (existing.tier >= 2) {
                return NextResponse.json(
                    { error: "You are already a Tier 2+ affiliate" },
                    { status: 400 }
                );
            }

            // Tier 1 upgrading to Tier 2
            // Allow them to apply
        }

        const {
            website,
            socialLinks,
            audienceSize,
            strategy,
            preferredCommissionRate
        } = await req.json();

        // Validate required fields
        if (!strategy || !audienceSize) {
            return NextResponse.json(
                { error: "Please provide your promotional strategy and audience size" },
                { status: 400 }
            );
        }

        const applicationData = {
            website: website || null,
            socialLinks: socialLinks || [],
            audienceSize,
            strategy,
            preferredCommissionRate: preferredCommissionRate || 15,
            submittedAt: new Date().toISOString()
        };

        if (existing && existing.tier === 1) {
            // Update existing Tier 1 to pending Tier 2
            await db
                .update(affiliates)
                .set({
                    status: "pending",
                    applicationData,
                    updatedAt: new Date()
                })
                .where(eq(affiliates.id, existing.id));

            return NextResponse.json({
                success: true,
                message: "Tier 2 upgrade application submitted. We'll review within 1-2 business days."
            });
        } else {
            // New Tier 2 application (user not an affiliate yet)
            // Generate referral code (inactive until approved)
            const referralCode = `T2${Date.now().toString(36).toUpperCase().slice(-6)}`;
            const referralLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://yoursite.com'}/ref/${referralCode}`;

            await db.insert(affiliates).values({
                userId,
                tier: 2,
                status: "pending",
                commissionRate: "15.00", // Default 15%, can be adjusted by admin
                lifetimeValueRate: "5.00",
                referralCode,
                referralLink,
                monthlyEarningCap: null, // No cap for Tier 2
                applicationData,
                approvedBy: null,
                approvedAt: null
            });

            return NextResponse.json({
                success: true,
                message: "Tier 2 application submitted. We'll review within 1-2 business days."
            });
        }

    } catch (error: any) {
        console.error("[Affiliate Application Error]:", error);
        return NextResponse.json(
            { error: "Failed to submit application" },
            { status: 500 }
        );
    }
}
