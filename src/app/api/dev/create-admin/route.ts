import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
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
        const email = "l.m.magyar@gmail.com";
        const password = "Propshot2026!";
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert admin user
        const result = await db.insert(users).values({
            id: crypto.randomUUID(),
            email: email,
            name: "Les Magyar",
            role: "admin",
            passwordHash: passwordHash,
            emailVerified: new Date(),
            isActive: true,
            createdAt: new Date(),
        }).returning({
            id: users.id,
            email: users.email,
            role: users.role,
        });

        return NextResponse.json({
            success: true,
            message: "Admin account created!",
            user: result[0],
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
                message: "Try logging in with email: l.m.magyar@gmail.com",
            }, { status: 409 });
        }

        console.error("[create-admin] Error:", error);
        return NextResponse.json({
            error: "Database error",
            message: error.message,
        }, { status: 500 });
    }
}
