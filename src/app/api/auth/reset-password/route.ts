import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

// Password strength validation
function isStrongPassword(password: string): { valid: boolean; message: string } {
    if (password.length < 8) {
        return { valid: false, message: "Password must be at least 8 characters" };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/[a-z]/.test(password)) {
        return { valid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: "Password must contain at least one number" };
    }
    return { valid: true, message: "" };
}

/**
 * POST /api/auth/reset-password
 * Validates token and updates user password
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { token, password, confirmPassword } = body;

        if (!token || !password) {
            return NextResponse.json(
                { error: "Token and password are required" },
                { status: 400 }
            );
        }

        if (password !== confirmPassword) {
            return NextResponse.json(
                { error: "Passwords do not match" },
                { status: 400 }
            );
        }

        // Validate password strength
        const passwordCheck = isStrongPassword(password);
        if (!passwordCheck.valid) {
            return NextResponse.json(
                { error: passwordCheck.message },
                { status: 400 }
            );
        }

        // Hash the incoming token to compare with stored hash
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        // Find valid token (not expired)
        const [tokenRecord] = await db
            .select()
            .from(verificationTokens)
            .where(
                and(
                    eq(verificationTokens.token, hashedToken),
                    gt(verificationTokens.expires, new Date())
                )
            )
            .limit(1);

        if (!tokenRecord) {
            return NextResponse.json(
                { error: "Invalid or expired reset link. Please request a new one." },
                { status: 400 }
            );
        }

        // Find user by email (identifier)
        const [user] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, tokenRecord.identifier))
            .limit(1);

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Update user's password
        await db
            .update(users)
            .set({ passwordHash })
            .where(eq(users.id, user.id));

        // Delete the used token
        await db
            .delete(verificationTokens)
            .where(eq(verificationTokens.token, hashedToken));

        console.log(`[Auth] Password reset successful for: ${tokenRecord.identifier}`);

        return NextResponse.json({
            success: true,
            message: "Password reset successfully. You can now log in with your new password."
        });

    } catch (error) {
        console.error("Reset Password Error:", error);
        return NextResponse.json(
            { error: "Failed to reset password. Please try again." },
            { status: 500 }
        );
    }
}
