import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

// Bootstrap admin emails from environment variable (comma-separated)
// Set ADMIN_BOOTSTRAP_EMAILS in .env for initial setup before DB admins exist
const BOOTSTRAP_ADMIN_EMAILS = (process.env.ADMIN_BOOTSTRAP_EMAILS || "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(email => email.length > 0);

export async function requireAdmin() {
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
        return {
            isAuthorized: false,
            response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        };
    }

    const email = session.user.email.toLowerCase();

    try {
        // Check database for admin role
        const user = await db
            .select({ role: users.role, isActive: users.isActive })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (user.length > 0) {
            // Check if account is suspended
            if (user[0].isActive === false) {
                return {
                    isAuthorized: false,
                    response: NextResponse.json({ error: "Account suspended" }, { status: 403 })
                };
            }

            // Check role in database
            if (user[0].role === "admin") {
                return { isAuthorized: true, user: session.user };
            }
        }

        // Fallback: Check bootstrap admin list (for initial setup)
        if (BOOTSTRAP_ADMIN_EMAILS.includes(email)) {
            console.log("[Admin Auth] Bootstrap admin access for:", email);
            return { isAuthorized: true, user: session.user };
        }

        // Not an admin
        return {
            isAuthorized: false,
            response: NextResponse.json({ error: "Forbidden: Admin Access Required" }, { status: 403 })
        };

    } catch (error) {
        console.error("[Admin Auth] Database error:", error);
        // In case of DB error, fall back to bootstrap list
        if (BOOTSTRAP_ADMIN_EMAILS.includes(email)) {
            return { isAuthorized: true, user: session.user };
        }
        return {
            isAuthorized: false,
            response: NextResponse.json({ error: "Authorization check failed" }, { status: 500 })
        };
    }
}
