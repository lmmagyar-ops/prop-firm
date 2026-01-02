import { db } from '@/db';
import { challenges } from '@/db/schema';
import { eq } from 'drizzle-orm';

export class BalanceManager {
    /**
     * Deducts cost from challenge balance
     */
    static async deductCost(
        tx: any,
        challengeId: string,
        amount: number
    ): Promise<number> {
        const challenge = await tx.query.challenges.findFirst({
            where: eq(challenges.id, challengeId)
        });

        if (!challenge) throw new Error('Challenge not found');

        const currentBalance = parseFloat(challenge.currentBalance);
        const newBalance = currentBalance - amount;

        console.log(`[BalanceManager] Deducting $${amount} from ${challengeId.slice(0, 8)}: $${currentBalance} → $${newBalance}`);

        await tx.update(challenges)
            .set({ currentBalance: newBalance.toString() })
            .where(eq(challenges.id, challengeId));

        return newBalance;
    }

    /**
     * Credits proceeds to challenge balance
     */
    static async creditProceeds(
        tx: any,
        challengeId: string,
        amount: number
    ): Promise<number> {
        const challenge = await tx.query.challenges.findFirst({
            where: eq(challenges.id, challengeId)
        });

        if (!challenge) throw new Error('Challenge not found');

        const currentBalance = parseFloat(challenge.currentBalance);
        const newBalance = currentBalance + amount;

        await tx.update(challenges)
            .set({ currentBalance: newBalance.toString() })
            .where(eq(challenges.id, challengeId));

        return newBalance;
    }
}
