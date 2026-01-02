import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user ID from email
        const dbUser = await db.query.users.findFirst({
            where: eq(users.email, session.user.email)
        });

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await request.json();
        const { leaderboardPrivacy, showCountry, showStatsPublicly } = body;

        // Validate privacy level
        const validPrivacyLevels = ["public", "semi_private", "fully_private"];
        if (!validPrivacyLevels.includes(leaderboardPrivacy)) {
            return NextResponse.json({ error: "Invalid privacy level" }, { status: 400 });
        }

        // Update user privacy settings
        await db
            .update(users)
            .set({
                leaderboardPrivacy,
                showCountry: Boolean(showCountry),
                showStatsPublicly: Boolean(showStatsPublicly),
            })
            .where(eq(users.id, dbUser.id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating privacy settings:", error);
        return NextResponse.json(
            { error: "Failed to update privacy settings" },
            { status: 500 }
        );
    }
}
