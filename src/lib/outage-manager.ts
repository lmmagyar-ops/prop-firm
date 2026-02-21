/**
 * Exchange Halt: Outage Manager
 * 
 * Centralized outage detection and management. Tracks Railway outages,
 * freezes evaluations during downtime, and extends challenge timers on recovery.
 * 
 * Key behaviors:
 * - Records outage start/end events in the outage_events table
 * - Provides getOutageStatus() for all callers (evaluator, trade API, UI)
 * - Extends challenge endsAt by exact outage duration on recovery
 * - Manages a 30-minute grace window after recovery
 */

import { db } from "@/db";
import { outageEvents, challenges } from "@/db/schema";
import { eq, and, isNull, isNotNull, sql } from "drizzle-orm";
import { getHeartbeat } from "./worker-client";
import { createLogger } from "./logger";

const logger = createLogger('OutageManager');

const STALE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes (matches heartbeat-check cron)
const GRACE_WINDOW_MS = 30 * 60 * 1000;   // 30 minutes after recovery

export interface OutageStatus {
    isOutage: boolean;
    isGraceWindow: boolean;
    outageStartedAt?: Date;
    graceEndsAt?: Date;
    message?: string;
}

export class OutageManager {
    /**
     * Get current outage status. Used by evaluator, trade API, and UI.
     */
    static async getOutageStatus(): Promise<OutageStatus> {
        try {
            // Check for active outage (no endedAt)
            const activeOutage = await db.query.outageEvents.findFirst({
                where: isNull(outageEvents.endedAt),
                orderBy: (oe, { desc }) => [desc(oe.startedAt)],
            });

            if (activeOutage) {
                return {
                    isOutage: true,
                    isGraceWindow: false,
                    outageStartedAt: activeOutage.startedAt,
                    message: "Trading halted — market data temporarily unavailable. Your evaluation timer is paused.",
                };
            }

            // Check for active grace window (recently ended outage)
            const recentOutage = await db.query.outageEvents.findFirst({
                where: and(
                    isNotNull(outageEvents.endedAt),
                    isNotNull(outageEvents.graceWindowEndsAt),
                ),
                orderBy: (oe, { desc }) => [desc(oe.endedAt)],
            });

            if (recentOutage?.graceWindowEndsAt && new Date() < recentOutage.graceWindowEndsAt) {
                return {
                    isOutage: false,
                    isGraceWindow: true,
                    graceEndsAt: recentOutage.graceWindowEndsAt,
                    message: "Trading resumed — manage your positions before evaluation resumes.",
                };
            }

            return { isOutage: false, isGraceWindow: false };
        } catch (error) {
            logger.error('Failed to check outage status', error instanceof Error ? error : null);
            // FAIL-SAFE: If we can't check, assume NOT in outage
            // (better to evaluate than to silently freeze forever)
            return { isOutage: false, isGraceWindow: false };
        }
    }

    /**
     * Record the start of a new outage. Idempotent — won't create duplicates
     * if an outage is already active.
     */
    static async recordOutageStart(reason: string): Promise<void> {
        try {
            // Check if there's already an active outage
            const existing = await db.query.outageEvents.findFirst({
                where: isNull(outageEvents.endedAt),
            });

            if (existing) {
                logger.info('Outage already active, skipping duplicate start', {
                    existingId: existing.id.slice(0, 8),
                    startedAt: existing.startedAt.toISOString(),
                });
                return;
            }

            await db.insert(outageEvents).values({
                startedAt: new Date(),
                reason,
            });

            logger.warn('🚨 OUTAGE STARTED', { reason });
        } catch (error) {
            logger.error('Failed to record outage start', error instanceof Error ? error : null);
        }
    }

    /**
     * Record the end of an active outage. Calculates duration,
     * sets grace window, and extends all active challenge timers.
     */
    static async recordOutageEnd(): Promise<void> {
        try {
            const activeOutage = await db.query.outageEvents.findFirst({
                where: isNull(outageEvents.endedAt),
            });

            if (!activeOutage) return; // No active outage to end

            const now = new Date();
            const durationMs = now.getTime() - activeOutage.startedAt.getTime();
            const graceWindowEndsAt = new Date(now.getTime() + GRACE_WINDOW_MS);

            // End the outage
            await db.update(outageEvents)
                .set({
                    endedAt: now,
                    durationMs,
                    graceWindowEndsAt,
                })
                .where(eq(outageEvents.id, activeOutage.id));

            // Extend all active challenge timers
            const extended = await this.extendChallengeTimers(durationMs);

            // Record how many challenges were extended
            await db.update(outageEvents)
                .set({ challengesExtended: extended })
                .where(eq(outageEvents.id, activeOutage.id));

            logger.warn('✅ OUTAGE ENDED', {
                durationMs,
                durationMin: Math.round(durationMs / 60000),
                challengesExtended: extended,
                graceWindowEndsAt: graceWindowEndsAt.toISOString(),
            });
        } catch (error) {
            logger.error('Failed to record outage end', error instanceof Error ? error : null);
        }
    }

    /**
     * Extend all active challenge timers by the outage duration.
     * Only extends challenges that have an endsAt set.
     * Returns the number of challenges extended.
     */
    private static async extendChallengeTimers(durationMs: number): Promise<number> {
        try {
            const durationSeconds = Math.ceil(durationMs / 1000);

            const result = await db.update(challenges)
                .set({
                    endsAt: sql`${challenges.endsAt} + make_interval(secs => ${durationSeconds})`,
                })
                .where(and(
                    eq(challenges.status, 'active'),
                    isNotNull(challenges.endsAt),
                ));

            const count = result.count ?? 0;
            logger.info('Extended challenge timers', { count, durationSeconds });
            return count;
        } catch (error) {
            logger.error('Failed to extend challenge timers', error instanceof Error ? error : null);
            return 0;
        }
    }

    /**
     * Check if the ingestion worker is currently healthy.
     * Uses the same heartbeat mechanism as the heartbeat-check cron.
     */
    static async isWorkerHealthy(): Promise<boolean> {
        try {
            const heartbeat = await getHeartbeat() as { timestamp: number } | null;
            if (!heartbeat) return false;
            const age = Date.now() - heartbeat.timestamp;
            return age < STALE_THRESHOLD_MS;
        } catch (e) {
            logger.warn('Heartbeat check failed', { error: String(e) });
            return false;
        }
    }
}
