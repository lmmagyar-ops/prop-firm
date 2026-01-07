import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * TEMPORARY: Admin endpoint to verify a user's email
 * DELETE THIS FILE AFTER USE
 * 
 * GET /api/dev/verify-email?email=test@example.com&secret=propshot-admin-2026
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const secret = searchParams.get("secret");

    // Basic protection
    if (secret !== "propshot-admin-2026") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!email) {
        return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    try {
        // First check if user exists
        const existingUser = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);

        if (existingUser.length === 0) {
            return NextResponse.json({
                error: "User not found",
                email
            }, { status: 404 });
        }

        // Update emailVerified
        const result = await db.update(users)
            .set({ emailVerified: new Date() })
            .where(eq(users.email, email.toLowerCase()))
            .returning({
                email: users.email,
                emailVerified: users.emailVerified,
                name: users.name
            });

        return NextResponse.json({
            success: true,
            message: "Email verified successfully!",
            user: result[0]
        });
    } catch (error: any) {
        console.error("[verify-email] Error:", error);
        return NextResponse.json({
            error: "Database error",
            message: error.message
        }, { status: 500 });
    }
}
