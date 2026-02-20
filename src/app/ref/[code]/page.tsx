import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/db";
import { affiliateReferrals, affiliates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { REFERRAL_COOKIE_MAX_AGE, REFERRAL_COOKIE_NAME } from "@/config/affiliates";
import { headers } from "next/headers";

/**
 * /ref/[code] — Referral landing route
 *
 * When someone clicks an affiliate link (e.g. fundedprediction.com/ref/REF1234):
 * 1. Validates the referral code against active affiliates
 * 2. Records the click in affiliate_referrals
 * 3. Sets a 30-day attribution cookie
 * 4. Redirects to /buy-evaluation
 *
 * Invalid codes silently redirect — don't leak info about which codes exist.
 */
export default async function ReferralPage({
    params,
}: {
    params: Promise<{ code: string }>;
}) {
    const { code } = await params;
    const refCode = code.toUpperCase();

    try {
        // Look up active affiliate
        const affiliate = await db.query.affiliates.findFirst({
            where: and(
                eq(affiliates.referralCode, refCode),
                eq(affiliates.status, "active")
            ),
        });

        if (affiliate) {
            // Record click
            const headersList = await headers();
            const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
            const userAgent = headersList.get("user-agent") || "unknown";
            const referrerUrl = headersList.get("referer") || null;

            await db.insert(affiliateReferrals).values({
                affiliateId: affiliate.id,
                userId: null, // Will be set on signup
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
                userAgent: userAgent.substring(0, 255),
            });

            // Set attribution cookie
            const cookieStore = await cookies();
            cookieStore.set(REFERRAL_COOKIE_NAME, refCode, {
                maxAge: REFERRAL_COOKIE_MAX_AGE,
                path: "/",
                httpOnly: true,
                sameSite: "lax",
            });
        }
        // Invalid codes silently redirect — fail closed, don't leak info
    } catch (error) {
        // Log but don't block redirect — the user should still see the site
        console.error("[Referral] Error tracking click:", error);
    }

    redirect(`/buy-evaluation?ref=${refCode}`);
}
