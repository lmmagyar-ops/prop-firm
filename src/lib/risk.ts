import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export class RiskEngine {

    /**
     * Checks if a new trade is allowed based on risk parameters.
     * Returns { allowed: true } or { allowed: false, reason: string }
     */
    static async validateTrade(challengeId: string, estimatedLoss: number = 0) {
        // 1. Fetch Challenge State
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId));

        if (!challenge || challenge.status !== "active") {
            return { allowed: false, reason: "Challenge not active" };
        }

        const rules = challenge.rulesConfig as any;
        const currentBalance = parseFloat(challenge.currentBalance);
        const startBalance = parseFloat(challenge.startingBalance);

        // Use Start of Day Balance (default to current/start if missing)
        // In real app, this MUST be populated by the worker.
        const sodBalance = parseFloat(challenge.startOfDayBalance || challenge.currentBalance);

        // --- RULE 1: MAX TOTAL DRAWDOWN (10% Static) ---
        // Equity must not fall below 90% of Starting Balance
        // Configurable via rules.maxDrawdownPercent (e.g., 0.10)
        const MAX_TOTAL_DD_PERCENT = rules.maxTotalDrawdownPercent || 0.10;
        const totalEquityFloor = startBalance * (1 - MAX_TOTAL_DD_PERCENT);

        if (currentBalance - estimatedLoss < totalEquityFloor) {
            return { allowed: false, reason: `Max Total Drawdown (10%) Reached. Floor: $${totalEquityFloor.toFixed(2)}` };
        }

        // --- RULE 2: MAX DAILY DRAWDOWN (5% of SOD Balance) ---
        // Equity must not fall below 95% of Balance at 00:00 UTC
        const MAX_DAILY_DD_PERCENT = rules.maxDailyDrawdownPercent || 0.05;
        const dailyEquityFloor = sodBalance * (1 - MAX_DAILY_DD_PERCENT);

        if (currentBalance - estimatedLoss < dailyEquityFloor) {
            return { allowed: false, reason: `Max Daily Loss (5%) Reached. Daily Floor: $${dailyEquityFloor.toFixed(2)}` };
        }

        return { allowed: true };
    }

    /**
     * Called to update High Water Mark after a profitable trade closed
     */
    static async updateHighWaterMark(challengeId: string, newBalance: number) {
        // Logic to fetch and update if newBalance > HWM
        // ...
    }
}
