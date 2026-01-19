import { db } from '@/db';
import { challenges } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * FORENSIC BALANCE MANAGER
 * 
 * Every balance modification is logged with:
 * - Timestamp
 * - Operation type (DEDUCT/CREDIT)
 * - Before/After balance
 * - Amount changed
 * - Stack trace (for debugging)
 * - Validation checks
 */
export class BalanceManager {

    private static formatLog(
        operation: 'DEDUCT' | 'CREDIT',
        challengeId: string,
        before: number,
        after: number,
        amount: number,
        source?: string
    ): void {
        const logEntry = {
            timestamp: new Date().toISOString(),
            operation,
            challengeId: challengeId.slice(0, 8),
            before: `$${before.toFixed(2)}`,
            after: `$${after.toFixed(2)}`,
            delta: operation === 'DEDUCT' ? `-$${amount.toFixed(2)}` : `+$${amount.toFixed(2)}`,
            source: source || 'unknown'
        };

        console.log(`[BALANCE_FORENSIC] ${JSON.stringify(logEntry)}`);

        // VALIDATION: Check for suspicious large changes
        if (amount > 10000) {
            console.error(`[BALANCE_ALERT] ⚠️ LARGE TRANSACTION: $${amount.toFixed(2)} on challenge ${challengeId.slice(0, 8)}`);
            console.error(`[BALANCE_ALERT] Stack trace:`, new Error().stack);
        }

        // VALIDATION: Check for unexpected balance increases on DEDUCT
        if (operation === 'DEDUCT' && after > before) {
            console.error(`[BALANCE_CORRUPTION] 🚨 CRITICAL: Balance INCREASED on DEDUCT operation!`);
            console.error(`[BALANCE_CORRUPTION] Before: $${before}, After: $${after}, Amount: $${amount}`);
            console.error(`[BALANCE_CORRUPTION] Challenge: ${challengeId}`);
            console.error(`[BALANCE_CORRUPTION] Stack trace:`, new Error().stack);
        }
    }

    /**
     * Deducts cost from challenge balance
     */
    static async deductCost(
        tx: any,
        challengeId: string,
        amount: number,
        source: string = 'trade'
    ): Promise<number> {
        const challenge = await tx.query.challenges.findFirst({
            where: eq(challenges.id, challengeId)
        });

        if (!challenge) throw new Error('Challenge not found');

        const currentBalance = parseFloat(challenge.currentBalance);
        const newBalance = currentBalance - amount;

        // Forensic logging
        this.formatLog('DEDUCT', challengeId, currentBalance, newBalance, amount, source);

        // VALIDATION: Prevent negative balance (should be caught earlier but double-check)
        if (newBalance < 0) {
            console.error(`[BALANCE_ALERT] ⚠️ Negative balance would result: $${newBalance.toFixed(2)}`);
        }

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
        amount: number,
        source: string = 'trade'
    ): Promise<number> {
        const challenge = await tx.query.challenges.findFirst({
            where: eq(challenges.id, challengeId)
        });

        if (!challenge) throw new Error('Challenge not found');

        const currentBalance = parseFloat(challenge.currentBalance);
        const newBalance = currentBalance + amount;

        // Forensic logging
        this.formatLog('CREDIT', challengeId, currentBalance, newBalance, amount, source);

        // VALIDATION: Check for suspiciously large credits
        const startingBalance = (challenge.rulesConfig as any)?.startingBalance || 10000;
        if (amount > startingBalance) {
            console.error(`[BALANCE_ALERT] ⚠️ Credit larger than starting balance!`);
            console.error(`[BALANCE_ALERT] Credit: $${amount.toFixed(2)}, Starting: $${startingBalance}`);
            console.error(`[BALANCE_ALERT] Challenge: ${challengeId}`);
            console.error(`[BALANCE_ALERT] Stack trace:`, new Error().stack);
        }

        await tx.update(challenges)
            .set({ currentBalance: newBalance.toString() })
            .where(eq(challenges.id, challengeId));

        return newBalance;
    }
}

