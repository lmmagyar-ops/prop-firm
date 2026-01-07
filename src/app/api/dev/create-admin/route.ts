import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

/**
 * TEMPORARY: Create admin user with minimal fields
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
        // First, let's see what columns the table has
        const tableInfo = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
            ORDER BY ordinal_position
        `);

        // Admin account details
        const id = crypto.randomUUID();
        const email = "l.m.magyar@gmail.com";
        const password = "Propshot2026!";
        const passwordHash = await bcrypt.hash(password, 10);

        // Try minimal insert
        try {
            await db.execute(sql`
                INSERT INTO users (id, email, password_hash, role)
                VALUES (${id}, ${email}, ${passwordHash}, 'admin')
            `);

            return NextResponse.json({
                success: true,
                message: "Admin account created!",
                credentials: { email, password },
                tableColumns: tableInfo.rows
            });
        } catch (insertError: any) {
            return NextResponse.json({
                error: "Insert failed",
                insertError: insertError.message,
                tableColumns: tableInfo.rows
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error("[create-admin] Error:", error);
        return NextResponse.json({
            error: "Database error",
            message: error.message,
        }, { status: 500 });
    }
}
