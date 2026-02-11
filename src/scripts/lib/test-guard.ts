/**
 * TEST GUARD — Crash-Safe Cleanup & Orphan Sweep
 * 
 * Shared module for all integration test scripts. Solves the problem of
 * orphaned test data when a script crashes mid-run before cleanup().
 * 
 * Features:
 *   1. Orphan sweep on startup — deletes stale test data from previous crashed runs
 *   2. Crash-safe cleanup — registers process handlers to run cleanup on crash/SIGINT
 *   3. Prefix registry — scripts register their cleanup function; guard runs them all on crash
 * 
 * Usage:
 *   import { TestGuard } from './lib/test-guard';
 *   const guard = new TestGuard('safety-bot');
 *   await guard.sweepOrphans();
 *   guard.registerCleanup(async () => { ... });
 *   // ... run tests ...
 *   await guard.cleanup(); // normal exit
 */

import { db } from '@/db';
import { users, challenges, positions, trades, payouts } from '@/db/schema';
import { eq, like, and, lt } from 'drizzle-orm';

// All known test prefixes — any user ID matching these patterns is test data
const TEST_PREFIXES = [
    'verify-bot-',
    'lifecycle-bot-',
    'safety-bot-',
];

// Test data older than this is considered orphaned from a crashed run
const ORPHAN_AGE_MS = 60 * 60 * 1000; // 1 hour

export class TestGuard {
    private prefix: string;
    private cleanupFns: Array<() => Promise<void>> = [];
    private hasRun = false;

    constructor(prefix: string) {
        this.prefix = prefix;

        // Register process handlers for crash-safe cleanup
        const handler = async (signal: string) => {
            if (this.hasRun) return;
            this.hasRun = true;
            console.error(`\n⚠️  [TestGuard] Caught ${signal} — running emergency cleanup...`);
            try {
                await this.cleanup();
                console.log('  ✅ [TestGuard] Emergency cleanup complete');
            } catch (e) {
                console.error('  ❌ [TestGuard] Emergency cleanup failed:', e);
            }
            process.exit(1);
        };

        process.on('uncaughtException', async (err) => {
            console.error('\n💀 [TestGuard] Uncaught exception:', err.message);
            await handler('uncaughtException');
        });

        process.on('unhandledRejection', async (reason) => {
            console.error('\n💀 [TestGuard] Unhandled rejection:', reason);
            await handler('unhandledRejection');
        });

        process.on('SIGINT', () => handler('SIGINT'));
        process.on('SIGTERM', () => handler('SIGTERM'));
    }

    /**
     * Register a cleanup function to run on crash or normal exit.
     */
    registerCleanup(fn: () => Promise<void>) {
        this.cleanupFns.push(fn);
    }

    /**
     * Sweep orphaned test data from previous crashed runs.
     * Runs on startup before tests begin.
     */
    async sweepOrphans(): Promise<number> {
        let totalSwept = 0;

        for (const prefix of TEST_PREFIXES) {
            const orphanedUsers = await db.select({ id: users.id, createdAt: users.createdAt })
                .from(users)
                .where(like(users.id, `${prefix}%`));

            const staleUsers = orphanedUsers.filter(u => {
                if (!u.createdAt) return true; // No timestamp = definitely orphaned
                return Date.now() - u.createdAt.getTime() > ORPHAN_AGE_MS;
            });

            if (staleUsers.length === 0) continue;

            console.log(`  🧹 [TestGuard] Sweeping ${staleUsers.length} orphaned '${prefix}*' users...`);

            for (const user of staleUsers) {
                try {
                    // Delete in FK order: payouts → trades → positions → challenges → users
                    await db.delete(payouts).where(eq(payouts.userId, user.id));
                    const userChallenges = await db.select({ id: challenges.id })
                        .from(challenges)
                        .where(eq(challenges.userId, user.id));
                    for (const c of userChallenges) {
                        await db.delete(trades).where(eq(trades.challengeId, c.id));
                        await db.delete(positions).where(eq(positions.challengeId, c.id));
                    }
                    await db.delete(challenges).where(eq(challenges.userId, user.id));
                    await db.delete(users).where(eq(users.id, user.id));
                    totalSwept++;
                } catch (e) {
                    console.warn(`  ⚠️  [TestGuard] Failed to sweep ${user.id}:`, (e as Error).message);
                }
            }
        }

        if (totalSwept > 0) {
            console.log(`  ✅ [TestGuard] Swept ${totalSwept} orphaned test users`);
        }

        return totalSwept;
    }

    /**
     * Run all registered cleanup functions.
     * Called on normal exit or crash.
     */
    async cleanup() {
        if (this.hasRun) return;
        this.hasRun = true;

        for (const fn of this.cleanupFns) {
            try {
                await fn();
            } catch (e) {
                console.warn('  ⚠️  [TestGuard] Cleanup function failed:', (e as Error).message);
            }
        }
    }

    /**
     * Mark cleanup as complete (prevents double-run from process handlers).
     */
    markComplete() {
        this.hasRun = true;
    }
}
