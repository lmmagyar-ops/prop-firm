import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { user2FA, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Delete 2FA record
        await db.delete(user2FA).where(eq(user2FA.userId, session.user.id));

        // Update user's 2FA status
        await db.update(users)
            .set({ twoFactorEnabled: false })
            .where(eq(users.id, session.user.id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("2FA disable error:", error);
        return NextResponse.json({ error: "Failed to disable 2FA" }, { status: 500 });
    }
}
