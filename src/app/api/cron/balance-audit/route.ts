import { NextResponse } from "next/server";
import { db } from "@/db";
import { challenges, trades, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
const logger = createLogger("BalanceAudit");

/**
 * BALANCE INTEGRITY CRON JOB
 * 
 * Runs daily to detect balance corruption across all active challenges.
 * Compares stored currentBalance against calculated balance from trade history.
 * 
 * Alerts on:
 * - Any discrepancy > $1 (accounting for rounding)
 * - Discrepancies that match suspicious patterns ($15K, etc.)
 */

interface BalanceAuditResult {
    challengeId: string;
    userId: string;
    status: string;
    startingBalance: number;
    storedBalance: number;
    calculatedBalance: number;
    positionValue: number;
    discrepancy: number;
    isSuspicious: boolean;
    suspiciousReason?: string;
}

export async function GET(req: Request) {
    // Verify cron secret for Vercel Cron
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info(`[BALANCE_AUDIT] Starting daily balance integrity check...`);

    try {
        // Get all active challenges
        const activeChallenges = await db.query.challenges.findMany({
            where: eq(challenges.status, "active")
        });

        logger.info(`[BALANCE_AUDIT] Auditing ${activeChallenges.length} active challenges`);

        const auditResults: BalanceAuditResult[] = [];
        const alerts: BalanceAuditResult[] = [];

        for (const challenge of activeChallenges) {
            const startingBalance = parseFloat(challenge.startingBalance || '10000');
            const storedBalance = parseFloat(challenge.currentBalance);

            // Get all trades for this challenge
            const allTrades = await db.query.trades.findMany({
                where: eq(trades.challengeId, challenge.id)
            });

            // Calculate expected balance from trade history
            let calculatedBalance = startingBalance;
            for (const trade of allTrades) {
                const amount = parseFloat(trade.amount);
                const shares = parseFloat(trade.shares);
                const price = parseFloat(trade.price);

                if (trade.type === "BUY") {
                    calculatedBalance -= amount;
                } else if (trade.type === "SELL") {
                    const proceeds = shares * price;
                    calculatedBalance += proceeds;
                }
            }

            // Get open positions value (for equity calculation)
            const openPositions = await db.query.positions.findMany({
                where: and(
                    eq(positions.challengeId, challenge.id),
                    eq(positions.status, "OPEN")
                )
            });

            let positionValue = 0;
            for (const pos of openPositions) {
                const shares = parseFloat(pos.shares);
                const price = parseFloat(pos.currentPrice || pos.entryPrice);
                positionValue += shares * price;
            }

            // Calculate discrepancy
            const discrepancy = storedBalance - calculatedBalance;
            const absDiscrepancy = Math.abs(discrepancy);

            // Determine if suspicious
            let isSuspicious = false;
            let suspiciousReason: string | undefined;

            if (absDiscrepancy > 1) { // More than $1 difference
                isSuspicious = true;

                // Check for known corruption patterns
                if (absDiscrepancy >= 14900 && absDiscrepancy <= 15100) {
                    suspiciousReason = "CRITICAL: $15K ghost credit pattern detected!";
                } else if (absDiscrepancy >= 24900 && absDiscrepancy <= 25100) {
                    suspiciousReason = "CRITICAL: $25K ghost credit pattern detected!";
                } else if (absDiscrepancy > 5000) {
                    suspiciousReason = "Large discrepancy - investigate immediately";
                } else if (absDiscrepancy > 100) {
                    suspiciousReason = "Moderate discrepancy - review needed";
                } else {
                    suspiciousReason = "Minor discrepancy - likely rounding";
                    isSuspicious = absDiscrepancy > 10; // Only flag if > $10
                }
            }

            const result: BalanceAuditResult = {
                challengeId: challenge.id,
                userId: challenge.userId || 'unknown',
                status: challenge.status,
                startingBalance,
                storedBalance,
                calculatedBalance: Math.round(calculatedBalance * 100) / 100,
                positionValue: Math.round(positionValue * 100) / 100,
                discrepancy: Math.round(discrepancy * 100) / 100,
                isSuspicious,
                suspiciousReason
            };

            auditResults.push(result);

            if (isSuspicious) {
                alerts.push(result);
                logger.error(`[BALANCE_ALERT] 🚨 ${suspiciousReason}`);
                logger.error(`[BALANCE_ALERT] Challenge: ${challenge.id}`);
                logger.error(`[BALANCE_ALERT] Stored: $${storedBalance}, Calculated: $${calculatedBalance}, Discrepancy: $${discrepancy}`);
            }
        }

        const summary = {
            timestamp: new Date().toISOString(),
            totalAudited: activeChallenges.length,
            alertsFound: alerts.length,
            status: alerts.length === 0 ? "HEALTHY" : "ALERTS_FOUND"
        };

        logger.info(`[BALANCE_AUDIT] Complete. ${alerts.length} alerts found.`);
        logger.info(`[BALANCE_AUDIT] ${JSON.stringify(summary)}`);

        return NextResponse.json({
            summary,
            alerts,
            allResults: auditResults
        });

    } catch (error) {
        logger.error("[BALANCE_AUDIT] Error:", error);
        return NextResponse.json({ error: "Audit failed" }, { status: 500 });
    }
}
