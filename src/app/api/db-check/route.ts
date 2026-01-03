import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
    try {
        // Test connection
        const connectionTest = await db.execute(sql`SELECT current_database(), version()`);

        // Check if business_rules table exists
        const tableExists = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        return NextResponse.json({
            success: true,
            connection: connectionTest.rows,
            tables: tableExists.rows,
            env: {
                hasDatabaseUrl: !!process.env.DATABASE_URL
            }
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
