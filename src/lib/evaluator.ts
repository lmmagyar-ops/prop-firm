import { db } from "@/db";
import { challenges, businessRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { publishAdminEvent } from "./events";

export class ChallengeEvaluator {

    static async evaluate(challengeId: string) {
        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.id, challengeId)
        });

        if (!challenge || challenge.status !== 'active') return;

        const currentBalance = parseFloat(challenge.currentBalance);
        const startingBalance = parseFloat(challenge.startingBalance);
        const rules = challenge.rulesConfig as any; // { profitTarget: 1000, maxDrawdown: 500 }

        const profitTarget = rules.profitTarget || 1000;
        const maxDrawdown = rules.maxDrawdown || 500;

        // 1. CHECK FAIL (Drawdown)
        if (currentBalance <= startingBalance - maxDrawdown) {
            console.log(`[Evaluator] Challenge ${challengeId} FAILED. Balance: ${currentBalance}`);

            await db.update(challenges)
                .set({ status: 'failed', endsAt: new Date() })
                .where(eq(challenges.id, challengeId));

            await publishAdminEvent("CHALLENGE_FAILED", { challengeId, reason: "Max Drawdown Breached" });
            return { status: 'failed' };
        }

        // 2. CHECK PASS (Profit Target)
        if (currentBalance >= startingBalance + profitTarget) {
            console.log(`[Evaluator] Challenge ${challengeId} PASSED! Balance: ${currentBalance}`);

            await db.update(challenges)
                .set({ status: 'passed', endsAt: new Date() })
                .where(eq(challenges.id, challengeId));

            await publishAdminEvent("CHALLENGE_PASSED", { challengeId, reason: "Profit Target Hit" });
            return { status: 'passed' };
        }

        return { status: 'active' };
    }
}
