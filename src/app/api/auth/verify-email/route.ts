import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createLogger } from "@/lib/logger";
const logger = createLogger("VerifyEmail");

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");

        if (!token) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prop-firmx.vercel.app";
            return NextResponse.redirect(`${appUrl}/login?error=missing_token`);
        }

        // Hash the token to compare with stored hash
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        // Find the token in the database
        const tokenRecord = await db
            .select()
            .from(verificationTokens)
            .where(
                and(
                    eq(verificationTokens.token, hashedToken),
                    gt(verificationTokens.expires, new Date())
                )
            )
            .limit(1);

        if (tokenRecord.length === 0) {
            logger.info("[VerifyEmail] Token not found or expired");
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prop-firmx.vercel.app";
            return NextResponse.redirect(`${appUrl}/login?error=invalid_token`);
        }

        const record = tokenRecord[0];
        const email = record.identifier;

        // Update user's emailVerified timestamp
        await db
            .update(users)
            .set({ emailVerified: new Date() })
            .where(eq(users.email, email));

        // Delete the used token
        await db
            .delete(verificationTokens)
            .where(
                and(
                    eq(verificationTokens.identifier, email),
                    eq(verificationTokens.token, hashedToken)
                )
            );

        logger.info("[VerifyEmail] Email verified successfully:", email);

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prop-firmx.vercel.app";
        return NextResponse.redirect(`${appUrl}/login?verified=true`);

    } catch (error) {
        logger.error("[VerifyEmail] Error:", error);
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prop-firmx.vercel.app";
        return NextResponse.redirect(`${appUrl}/login?error=verification_failed`);
    }
}
