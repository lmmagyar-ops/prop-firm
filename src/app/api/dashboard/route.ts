import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/dashboard-service";
import { auth } from "@/auth";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Dashboard");

export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Ownership check: users can only access their own dashboard
    if (userId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const data = await getDashboardData(userId);

        if (!data) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        logger.error("Dashboard API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
