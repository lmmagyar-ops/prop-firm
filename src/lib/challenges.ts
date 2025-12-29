import { db } from "@/db";
import { challenges, businessRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { addDays } from "date-fns";

// Default config for the MVP $10k Challenge
const DEFAULT_RULES = {
    tier: "10k",
    startingBalance: 10000,

    // CRITICAL: profitTarget and maxDrawdown are ABSOLUTE DOLLAR VALUES
    // Evaluator compares: equity >= startingBalance + profitTarget
    profitTarget: 1000, // 10% of $10k = $1000
    maxDrawdown: 800, // 8% of $10k = $800
    maxTotalDrawdownPercent: 0.08, // 8% (for display)
    maxDailyDrawdownPercent: 0.04, // 4%

    // Position Sizing
    maxPositionSizePercent: 0.05, // 5% per market
    maxCategoryExposurePercent: 0.10, // 10% per category
    lowVolumeThreshold: 10_000_000, // $10M
    lowVolumeMaxPositionPercent: 0.025, // 2.5%

    // Liquidity
    maxVolumeImpactPercent: 0.10, // 10% of 24h volume
    minMarketVolume: 100_000, // $100k

    // Legacy (for backwards compatibility)
    maxDrawdownPercent: 0.08,
    dailyLossPercent: 0.04,
    profitTargetPercent: 0.10,
    durationDays: 60,
    profitSplit: 0.7, // 70% to trader
};

export class ChallengeManager {

    /**
     * Creates a new Challenge for a user.
     * In production, this is called after Confirmo/PayPal webhook verification.
     */
    static async createChallenge(userId: string) {
        // 1. Fetch active rulesConfig from DB or use defaults.
        // For MVP, we use defaults but structured to load from DB later.
        const rules = DEFAULT_RULES;

        // 2. Insert new challenge
        const [newChallenge] = await db
            .insert(challenges)
            .values({
                userId,
                phase: "challenge",
                status: "active",
                startingBalance: rules.startingBalance.toString(),
                currentBalance: rules.startingBalance.toString(),
                highWaterMark: rules.startingBalance.toString(),
                rulesConfig: rules,
                startedAt: new Date(),
                endsAt: addDays(new Date(), rules.durationDays),
            })
            .returning();

        console.log(`[ChallengeManager] Created Challenge ${newChallenge.id} for User ${userId}`);
        return newChallenge;
    }

    static async getActiveChallenge(userId: string) {
        const results = await db
            .select()
            .from(challenges)
            .where(eq(challenges.userId, userId));

        // Return first active one
        return results.find((c) => c.status === "active");
    }

    static async failChallenge(challengeId: string, reason: string) {
        await db
            .update(challenges)
            .set({ status: "failed" })
            .where(eq(challenges.id, challengeId));

        console.log(`[ChallengeManager] Challenge ${challengeId} FAILED: ${reason}`);
    }
}
