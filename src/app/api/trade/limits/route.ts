import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { RiskEngine } from "@/lib/risk";
import { getErrorMessage } from "@/lib/errors";
import { createLogger } from "@/lib/logger";
const logger = createLogger("Limits");

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const challengeId = searchParams.get("challengeId");
        const marketId = searchParams.get("marketId");

        if (!challengeId || !marketId) {
            return NextResponse.json(
                { error: "Missing required params: challengeId, marketId" },
                { status: 400 }
            );
        }

        const limits = await RiskEngine.getPreflightLimits(challengeId, marketId);

        return NextResponse.json(limits);
    } catch (error) {
        logger.error("[/api/trade/limits] Error:", error);
        return NextResponse.json(
            { error: getErrorMessage(error) },
            { status: 500 }
        );
    }
}
