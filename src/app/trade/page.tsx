import { auth } from "@/auth";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import { TradingTerminal } from "@/components/trade/TradingTerminal";

export default async function TradePage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/api/auth/signin");
    }

    // Fetch the active challenge for this user
    const activeChallenge = await db.query.challenges.findFirst({
        where: and(
            eq(challenges.userId, session.user.id),
            eq(challenges.status, "active")
        ),
    });

    if (!activeChallenge) {
        // If no active challenge, redirect back to dashboard
        redirect("/dashboard");
    }

    // Map database challenge to TradingTerminal expected format
    const rulesConfig = activeChallenge.rulesConfig as any;
    const mappedChallenge = {
        id: activeChallenge.id,
        startedAt: activeChallenge.startedAt || new Date(),
        durationDays: rulesConfig?.durationDays || 30,
        initialBalance: parseFloat(activeChallenge.startingBalance),
        profitTarget: rulesConfig?.profitTarget || 1000,
        maxDrawdown: rulesConfig?.maxDrawdown || 800,
        currentBalance: activeChallenge.currentBalance,
    };

    return (
        <div className="min-h-screen bg-[#0A0B0E] text-white">
            <TradingTerminal challenge={mappedChallenge} />
        </div>
    );
}
