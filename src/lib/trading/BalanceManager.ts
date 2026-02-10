import { challenges } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';
import { type Transaction } from '@/db/types';
import { invariant, softInvariant } from '@/lib/invariant';

const logger = createLogger('BalanceManager');

/**
 * FORENSIC BALANCE MANAGER
 * 
 * Every balance modification is logged with:
 * - Timestamp
 * - Operation type (DEDUCT/CREDIT)
 * - Before/After balance
 * - Amount changed
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
            operation,
            challengeId: challengeId.slice(0, 8),
            before: `$${before.toFixed(2)}`,
            after: `$${after.toFixed(2)}`,
            delta: operation === 'DEDUCT' ? `-$${amount.toFixed(2)}` : `+$${amount.toFixed(2)}`,
            source: source || 'unknown'
        };

        logger.info('Balance update', logEntry);

        // VALIDATION: Check for suspicious large changes
        softInvariant(amount <= 10000, 'Large balance transaction detected', {
            amount, challengeId, operation, source,
        });

        // VALIDATION: Check for unexpected balance increases on DEDUCT
        if (operation === 'DEDUCT' && after > before) {
            invariant(false, 'Balance INCREASED on DEDUCT operation', {
                before, after, amount, challengeId, source,
            });
        }
    }

    /**
     * Deducts cost from challenge balance
     */
    static async deductCost(
        tx: Transaction,
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

        // HARD GUARD: Prevent negative balance from being written to DB
        // Allow tiny floating-point dust (< 1 cent) but reject real negatives
        if (newBalance < -0.01) {
            logger.error('BLOCKED negative balance', null, {
                newBalance, challengeId, currentBalance, amount, source,
            });
            throw new Error(`Balance would go negative: $${newBalance.toFixed(2)}. Trade rejected.`);
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
        tx: Transaction,
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
        const startingBalance = parseFloat(challenge.startingBalance || '10000');
        softInvariant(amount <= startingBalance, 'Credit larger than starting balance', {
            amount, startingBalance, challengeId, source,
        });

        await tx.update(challenges)
            .set({ currentBalance: newBalance.toString() })
            .where(eq(challenges.id, challengeId));

        return newBalance;
    }

    /**
     * Resets balance to a specific value (e.g., funded transition resets to starting balance).
     * Unlike deduct/credit, this is an absolute set — used for phase transitions only.
     */
    static async resetBalance(
        tx: Transaction,
        challengeId: string,
        newBalance: number,
        source: string = 'funded_transition'
    ): Promise<number> {
        const challenge = await tx.query.challenges.findFirst({
            where: eq(challenges.id, challengeId)
        });

        if (!challenge) throw new Error('Challenge not found');

        const currentBalance = parseFloat(challenge.currentBalance);

        logger.info('Balance RESET', {
            challengeId: challengeId.slice(0, 8),
            before: `$${currentBalance.toFixed(2)}`,
            after: `$${newBalance.toFixed(2)}`,
            delta: `${(newBalance - currentBalance) >= 0 ? '+' : ''}$${(newBalance - currentBalance).toFixed(2)}`,
            source,
        });

        await tx.update(challenges)
            .set({ currentBalance: newBalance.toString() })
            .where(eq(challenges.id, challengeId));

        return newBalance;
    }

    /**
     * Adjusts balance by a delta (positive = credit, negative = debit).
     * Used for settlement proceeds, fee charges, and other non-trade balance changes.
     */
    static async adjustBalance(
        tx: Transaction,
        challengeId: string,
        delta: number,
        source: string
    ): Promise<number> {
        const challenge = await tx.query.challenges.findFirst({
            where: eq(challenges.id, challengeId)
        });

        if (!challenge) throw new Error('Challenge not found');

        const currentBalance = parseFloat(challenge.currentBalance);
        const newBalance = currentBalance + delta;

        // Use existing forensic logging
        const operation = delta >= 0 ? 'CREDIT' : 'DEDUCT';
        this.formatLog(operation, challengeId, currentBalance, newBalance, Math.abs(delta), source);

        // HARD GUARD: Prevent negative balance (same guard as deductCost)
        if (newBalance < -0.01) {
            logger.error('BLOCKED negative balance', null, {
                newBalance, challengeId, currentBalance, delta, source,
            });
            throw new Error(`Balance would go negative: $${newBalance.toFixed(2)}. Operation rejected.`);
        }

        await tx.update(challenges)
            .set({ currentBalance: newBalance.toString() })
            .where(eq(challenges.id, challengeId));

        return newBalance;
    }
}

