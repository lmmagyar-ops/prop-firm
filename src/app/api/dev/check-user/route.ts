import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * TEMPORARY DIAGNOSTIC: Check if user exists in database
 * DELETE THIS FILE AFTER USE
 * 
 * GET /api/dev/check-user?secret=propshot-admin-2026
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (secret !== "propshot-admin-2026") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Get all users (limited to 50)
        const allUsers = await db.select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            emailVerified: users.emailVerified,
            hasPassword: users.passwordHash,
            createdAt: users.createdAt,
        }).from(users).limit(50);

        // Mask passwords for security
        const safeUsers = allUsers.map(u => ({
            ...u,
            hasPassword: !!u.hasPassword,
        }));

        return NextResponse.json({
            count: allUsers.length,
            users: safeUsers
        });
    } catch (error: any) {
        console.error("[check-user] Error:", error);
        return NextResponse.json({
            error: "Database error",
            message: error.message,
            stack: error.stack?.split('\n').slice(0, 5)
        }, { status: 500 });
    }
}
