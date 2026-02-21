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
 * 
 * NOTE: All methods use tx.select().from(challenges).where() instead of
 * tx.query.challenges.findFirst() because postgres.js's relational query API
 * (.query.*) does not correctly scope to the transaction connection — it leaks
 * outside the transaction, reading stale data. The lower-level .select() API
 * correctly runs within the transaction. (See: Sentry N+1 fix, Feb 2026)
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
     * Reads challenge balance within the current transaction.
     * Uses tx.select() (not tx.query.*) to correctly scope to the tx connection.
     */
    private static async readBalance(tx: Transaction, challengeId: string): Promise<{ currentBalance: number; startingBalance: number }> {
        const rows = await tx.select({
            currentBalance: challenges.currentBalance,
            startingBalance: challenges.startingBalance,
        }).from(challenges).where(eq(challenges.id, challengeId));

        const challenge = rows[0];
        if (!challenge) throw new Error('Challenge not found');

        return {
            currentBalance: parseFloat(challenge.currentBalance),
            startingBalance: parseFloat(challenge.startingBalance),
        };
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
        const { currentBalance } = await this.readBalance(tx, challengeId);
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
        const { currentBalance, startingBalance } = await this.readBalance(tx, challengeId);
        const newBalance = currentBalance + amount;

        // Forensic logging
        this.formatLog('CREDIT', challengeId, currentBalance, newBalance, amount, source);

        // VALIDATION: Check for suspiciously large credits
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
        const { currentBalance } = await this.readBalance(tx, challengeId);

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
        const { currentBalance, startingBalance } = await this.readBalance(tx, challengeId);
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


