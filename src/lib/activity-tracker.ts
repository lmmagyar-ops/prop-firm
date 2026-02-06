/**
 * Activity Tracker
 * 
 * Tracks trading activity for funded accounts to enforce:
 * 1. Minimum trading days per payout cycle (5 days)
 * 2. Consistency rule (flag if >50% profits in single day)
 * 3. Inactivity termination (30 days)
 */

import { db } from "@/db";
import { challenges, trades, positions } from "@/db/schema";
import { eq, and, gte, sql, lt } from "drizzle-orm";
import { CONSISTENCY_CONFIG } from "./funded-rules";
import { subDays, startOfDay, endOfDay, isSameDay } from "date-fns";
import { safeParseFloat } from "./safe-parse";

export interface ActivityCheckResult {
    activeTradingDays: number;
    isConsistencyFlagged: boolean;
    consistencyReason?: string;
    lastActivityAt: Date | null;
    isInactive: boolean;
    inactiveDays: number;
}

export class ActivityTracker {

    /**
     * Record trading activity for a funded account.
     * Called after each successful trade.
     */
    static async recordTradingDay(challengeId: string): Promise<void> {
        const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId));

        if (!challenge || challenge.phase !== "funded") {
            return; // Only track for funded accounts
        }

        const now = new Date();
        const lastActivity = challenge.lastActivityAt;

        // Check if this is the first trade of the day
        const isFirstTradeOfDay = !lastActivity || !isSameDay(lastActivity, now);

        if (isFirstTradeOfDay) {
            // Increment active trading days
            const newDays = (challenge.activeTradingDays || 0) + 1;

            await db.update(challenges)
                .set({
                    activeTradingDays: newDays,
                    lastActivityAt: now,
                })
                .where(eq(challenges.id, challengeId));

            console.log(`[ActivityTracker] ${challengeId.slice(0, 8)}: New trading day recorded (${newDays} total)`);
        } else {
            // Just update last activity timestamp
            await db.update(challenges)
                .set({ lastActivityAt: now })
                .where(eq(challenges.id, challengeId));
        }
    }

    /**
     * Check consistency rule: No single day should account for >50% of total profits.
     * Called after trades close with profit.
     */
    static async checkConsistency(challengeId: string): Promise<{ flagged: boolean; reason?: string }> {
        const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId));

        if (!challenge || challenge.phase !== "funded") {
            return { flagged: false };
        }

        const currentBalance = safeParseFloat(challenge.currentBalance);
        const startingBalance = safeParseFloat(challenge.startingBalance);
        const cycleStart = challenge.payoutCycleStart || challenge.startedAt;

        if (!cycleStart) {
            return { flagged: false };
        }

        const totalProfit = currentBalance - startingBalance;
        if (totalProfit <= 0) {
            return { flagged: false }; // No profit to check
        }

        // Get today's trades and calculate today's profit
        const today = new Date();
        const todayStart = startOfDay(today);
        const todayEnd = endOfDay(today);

        const todaysTrades = await db.query.trades.findMany({
            where: and(
                eq(trades.challengeId, challengeId),
                gte(trades.executedAt, todayStart)
            )
        });

        // If less than minTradesForFlag trades today, it's likely skill not gambling
        if (todaysTrades.length >= CONSISTENCY_CONFIG.minTradesForFlag) {
            return { flagged: false };
        }

        // Get today's closed positions and their P&L
        const todaysClosedPositions = await db.query.positions.findMany({
            where: and(
                eq(positions.challengeId, challengeId),
                eq(positions.status, "CLOSED"),
                gte(positions.closedAt, todayStart)
            )
        });

        const todaysProfit = todaysClosedPositions.reduce((sum, pos) => {
            return sum + safeParseFloat(pos.pnl);
        }, 0);

        // Check if today's profit is >50% of total
        const profitRatio = todaysProfit / totalProfit;

        if (profitRatio > CONSISTENCY_CONFIG.maxSingleDayProfitPercent) {
            const reason = `Single-day profit (${(profitRatio * 100).toFixed(1)}%) exceeds ${CONSISTENCY_CONFIG.maxSingleDayProfitPercent * 100}% threshold`;

            // Set soft flag (doesn't fail account, just flags for review)
            await db.update(challenges)
                .set({ consistencyFlagged: true })
                .where(eq(challenges.id, challengeId));

            console.log(`[ActivityTracker] ${challengeId.slice(0, 8)}: Consistency flag set - ${reason}`);
            return { flagged: true, reason };
        }

        return { flagged: false };
    }

    /**
     * Check for inactive funded accounts (>30 days no activity).
     * Called by daily cron job.
     */
    static async checkInactivity(): Promise<{ terminated: string[]; flagged: string[] }> {
        const terminated: string[] = [];
        const flagged: string[] = [];

        const inactivityThreshold = subDays(new Date(), CONSISTENCY_CONFIG.inactivityDays);

        // Find funded accounts with lastActivityAt > 30 days ago
        const inactiveAccounts = await db.query.challenges.findMany({
            where: and(
                eq(challenges.phase, "funded"),
                eq(challenges.status, "active"),
                lt(challenges.lastActivityAt, inactivityThreshold)
            )
        });

        for (const account of inactiveAccounts) {
            const daysSinceActivity = Math.floor(
                (Date.now() - (account.lastActivityAt?.getTime() || 0)) / (1000 * 60 * 60 * 24)
            );

            console.log(`[ActivityTracker] Inactive account ${account.id.slice(0, 8)}: ${daysSinceActivity} days inactive`);

            // Terminate the account
            await db.update(challenges)
                .set({
                    status: "failed",
                    // Store failure reason in rulesConfig or a new field
                })
                .where(eq(challenges.id, account.id));

            terminated.push(account.id);
        }

        console.log(`[ActivityTracker] Inactivity check complete: ${terminated.length} terminated, ${flagged.length} flagged`);
        return { terminated, flagged };
    }

    /**
     * Get activity status for a funded account.
     */
    static async getActivityStatus(challengeId: string): Promise<ActivityCheckResult> {
        const [challenge] = await db.select().from(challenges).where(eq(challenges.id, challengeId));

        if (!challenge) {
            return {
                activeTradingDays: 0,
                isConsistencyFlagged: false,
                lastActivityAt: null,
                isInactive: true,
                inactiveDays: 999
            };
        }

        const lastActivity = challenge.lastActivityAt;
        const inactiveDays = lastActivity
            ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
            : 999;

        return {
            activeTradingDays: challenge.activeTradingDays || 0,
            isConsistencyFlagged: challenge.consistencyFlagged || false,
            consistencyReason: challenge.consistencyFlagged ? "Single-day profit exceeded threshold" : undefined,
            lastActivityAt: lastActivity,
            isInactive: inactiveDays >= CONSISTENCY_CONFIG.inactivityDays,
            inactiveDays
        };
    }

    /**
     * Clear consistency flag (admin action after review).
     */
    static async clearConsistencyFlag(challengeId: string): Promise<void> {
        await db.update(challenges)
            .set({ consistencyFlagged: false })
            .where(eq(challenges.id, challengeId));

        console.log(`[ActivityTracker] Consistency flag cleared for ${challengeId.slice(0, 8)}`);
    }
}
