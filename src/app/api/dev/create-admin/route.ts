import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

/**
 * TEMPORARY: Create admin user
 * DELETE THIS FILE AFTER USE
 * 
 * GET /api/dev/create-admin?secret=propshot-admin-2026
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret");

    if (secret !== "propshot-admin-2026") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        // Admin account details
        const id = crypto.randomUUID();
        const email = "l.m.magyar@gmail.com";
        const password = "Propshot2026!";
        const passwordHash = await bcrypt.hash(password, 10);
        const name = "Les Magyar";

        // Insert admin user with raw SQL
        await db.execute(sql`
            INSERT INTO users (id, email, name, role, password_hash, "emailVerified", is_active, created_at)
            VALUES (${id}, ${email}, ${name}, 'admin', ${passwordHash}, NOW(), true, NOW())
            ON CONFLICT (id) DO NOTHING
        `);

        return NextResponse.json({
            success: true,
            message: "Admin account created!",
            credentials: {
                email: email,
                password: password,
            }
        });
    } catch (error: any) {
        // Check if user already exists
        if (error.message?.includes("duplicate") || error.code === "23505") {
            return NextResponse.json({
                error: "User already exists",
                message: "Try logging in with email: l.m.magyar@gmail.com and password: Propshot2026!",
            }, { status: 409 });
        }

        console.error("[create-admin] Error:", error);
        return NextResponse.json({
            error: "Database error",
            message: error.message,
        }, { status: 500 });
    }
}
