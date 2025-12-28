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

        // 1. CHECK FAIL (Drawdown based on EQUITY) - With Confirmation Delay
        const FAILURE_CONFIRMATION_DELAY_MS = 60_000; // 60 seconds
        const equityFloor = startingBalance - maxDrawdown;

        if (equity <= equityFloor) {
            // Breach detected
            if (!challenge.pendingFailureAt) {
                // First breach: Set pending timestamp, don't fail yet
                console.log(`[Evaluator] Challenge ${challengeId} BREACHED. Setting pending failure. Equity: ${equity.toFixed(2)}`);
                await db.update(challenges)
                    .set({ pendingFailureAt: new Date() })
                    .where(eq(challenges.id, challengeId));
                return { status: 'pending_failure' };
            }

            // Breach persisted: Check if 60 seconds have passed
            const timeSinceBreach = Date.now() - new Date(challenge.pendingFailureAt).getTime();
            if (timeSinceBreach >= FAILURE_CONFIRMATION_DELAY_MS) {
                console.log(`[Evaluator] Challenge ${challengeId} FAILED (Confirmed after ${Math.round(timeSinceBreach / 1000)}s). Equity: ${equity.toFixed(2)}`);
                await db.update(challenges)
                    .set({ status: 'failed', endsAt: new Date(), pendingFailureAt: null })
                    .where(eq(challenges.id, challengeId));

                await publishAdminEvent("CHALLENGE_FAILED", { challengeId, reason: "Max Drawdown Breached (Confirmed)" });
                return { status: 'failed' };
            }

            // Still in grace period
            console.log(`[Evaluator] Challenge ${challengeId} still pending failure. ${Math.round((FAILURE_CONFIRMATION_DELAY_MS - timeSinceBreach) / 1000)}s remaining.`);
            return { status: 'pending_failure' };
        } else {
            // Equity recovered - clear pending failure if set
            if (challenge.pendingFailureAt) {
                console.log(`[Evaluator] Challenge ${challengeId} RECOVERED. Clearing pending failure.`);
                await db.update(challenges)
                    .set({ pendingFailureAt: null })
                    .where(eq(challenges.id, challengeId));
            }
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
