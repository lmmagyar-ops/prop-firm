import { db } from "@/db";
import { challenges, positions, businessRules } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { publishAdminEvent } from "./events";
import { ChallengeRules } from "@/types/trading";
import { MarketService } from "./market";

export class ChallengeEvaluator {

    static async evaluate(challengeId: string) {
        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.id, challengeId)
        });

        if (!challenge || challenge.status !== 'active') return;

        const currentBalance = parseFloat(challenge.currentBalance);
        const startingBalance = parseFloat(challenge.startingBalance);
        const rules = challenge.rulesConfig as unknown as ChallengeRules;

        const profitTarget = rules.profitTarget || 1000;
        const maxDrawdown = rules.maxDrawdown || 500;

        // Calculate Equity (Cash + Unrealized Value of Positions)
        const openPositions = await db.query.positions.findMany({
            where: and(eq(positions.challengeId, challengeId), eq(positions.status, 'OPEN'))
        });

        let positionValue = 0;
        for (const pos of openPositions) {
            // Try to get live price, fallback to DB last known, fallback to entry
            const marketData = await MarketService.getLatestPrice(pos.marketId);
            const price = marketData ? parseFloat(marketData.price) : (pos.currentPrice ? parseFloat(pos.currentPrice) : parseFloat(pos.entryPrice));
            positionValue += parseFloat(pos.shares) * price;
        }

        const equity = currentBalance + positionValue;

        // 0. CHECK TIME EXPIRY
        if (challenge.endsAt && new Date() > new Date(challenge.endsAt)) {
            console.log(`[Evaluator] Challenge ${challengeId} FAILED. Time Limit Exceeded.`);
            await db.update(challenges)
                .set({ status: 'failed', endsAt: new Date() }) // Lock it
                .where(eq(challenges.id, challengeId));

            await publishAdminEvent("CHALLENGE_FAILED", { challengeId, reason: "Time Limit Exceeded" });
            return { status: 'failed' };
        }

        // 1. CHECK FAIL (Drawdown based on EQUITY)
        if (equity <= startingBalance - maxDrawdown) {
            console.log(`[Evaluator] Challenge ${challengeId} FAILED. Equity: ${equity.toFixed(2)} (Bal: ${currentBalance} + Pos: ${positionValue.toFixed(2)})`);

            await db.update(challenges)
                .set({ status: 'failed', endsAt: new Date() })
                .where(eq(challenges.id, challengeId));

            await publishAdminEvent("CHALLENGE_FAILED", { challengeId, reason: "Max Drawdown Breached" });
            return { status: 'failed' };
        }

        // 2. CHECK PASS (Profit Target based on EQUITY)
        if (equity >= startingBalance + profitTarget) {
            console.log(`[Evaluator] Challenge ${challengeId} PASSED! Equity: ${equity.toFixed(2)}`);

            await db.update(challenges)
                .set({ status: 'passed', endsAt: new Date() })
                .where(eq(challenges.id, challengeId));

            await publishAdminEvent("CHALLENGE_PASSED", { challengeId, reason: "Profit Target Hit" });
            return { status: 'passed' };
        }

        return { status: 'active' };
    }
}
