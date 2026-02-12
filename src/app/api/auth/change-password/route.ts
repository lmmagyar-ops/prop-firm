import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { auth } from "@/auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("ChangePassword");

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
 * POST /api/auth/change-password
 * Allows authenticated users to change their password
 */
export async function POST(request: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "You must be logged in to change your password" },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { currentPassword, newPassword, confirmPassword } = body;

        // Validate required fields
        if (!currentPassword || !newPassword || !confirmPassword) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }

        // Check passwords match
        if (newPassword !== confirmPassword) {
            return NextResponse.json(
                { error: "New passwords do not match" },
                { status: 400 }
            );
        }

        // Validate new password strength
        const passwordCheck = isStrongPassword(newPassword);
        if (!passwordCheck.valid) {
            return NextResponse.json(
                { error: passwordCheck.message },
                { status: 400 }
            );
        }

        // Get user with current password hash
        const [user] = await db
            .select({ id: users.id, passwordHash: users.passwordHash })
            .from(users)
            .where(eq(users.id, session.user.id))
            .limit(1);

        if (!user || !user.passwordHash) {
            return NextResponse.json(
                { error: "Unable to verify current password" },
                { status: 400 }
            );
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
            return NextResponse.json(
                { error: "Current password is incorrect" },
                { status: 400 }
            );
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password
        await db
            .update(users)
            .set({ passwordHash: newPasswordHash })
            .where(eq(users.id, session.user.id));

        logger.info(`[Auth] Password changed for user: ${session.user.id}`);

        return NextResponse.json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {
        logger.error("Change Password Error:", error);
        return NextResponse.json(
            { error: "Failed to change password. Please try again." },
            { status: 500 }
        );
    }
}
