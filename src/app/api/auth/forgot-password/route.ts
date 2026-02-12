import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { createLogger } from "@/lib/logger";
const logger = createLogger("ForgotPassword");

/**
 * POST /api/auth/forgot-password
 * Initiates password reset by generating a reset token and sending email
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Find user by email
        const [user] = await db
            .select({ id: users.id, email: users.email })
            .from(users)
            .where(eq(users.email, normalizedEmail))
            .limit(1);

        // Always return success to prevent email enumeration
        const successResponse = {
            success: true,
            message: "If an account exists with this email, you will receive a password reset link."
        };

        if (!user) {
            // Don't reveal that user doesn't exist
            return NextResponse.json(successResponse);
        }

        // Generate secure random token
        const token = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Token expires in 1 hour
        const expires = new Date(Date.now() + 60 * 60 * 1000);

        // Delete any existing reset tokens for this email
        await db
            .delete(verificationTokens)
            .where(eq(verificationTokens.identifier, normalizedEmail));

        // Store hashed token in database
        await db.insert(verificationTokens).values({
            identifier: normalizedEmail,
            token: hashedToken,
            expires,
        });

        // Send reset email with the unhashed token
        await sendPasswordResetEmail(normalizedEmail, token);

        logger.info(`[Auth] Password reset requested for: ${normalizedEmail}`);

        return NextResponse.json(successResponse);

    } catch (error) {
        logger.error("Forgot Password Error:", error);
        return NextResponse.json(
            { error: "Failed to process request. Please try again." },
            { status: 500 }
        );
    }
}
