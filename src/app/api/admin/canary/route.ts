/**
 * Production Canary — Infrastructure Health Traffic Lights
 *
 * Answers: "Is the infrastructure that protects capital actually working?"
 *
 * 5 real-time checks:
 * 1. Risk Monitor Heartbeat — Is the 30s loop running?
 * 2. Position Price Coverage — Can ALL funded positions be priced right now?
 * 3. Daily Reset Freshness — Did the midnight reset actually run?
 * 4. Order Book Freshness — Does the worker have market data?
 * 5. Worker Reachability — Can we reach the Railway worker at all?
 *
 * INCIDENT 2026-03-04: Risk monitor appeared healthy (heartbeat green) but
 * had ZERO prices. Mat's 133% drawdown breach went undetected. This canary
 * exists to prevent that class of silent infrastructure failure.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/db";
import { challenges, positions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { MarketService } from "@/lib/market";
import { getIngestionHealth, getAllOrderBooks } from "@/lib/worker-client";
import { createLogger } from "@/lib/logger";
import Redis from "ioredis";

const logger = createLogger("Canary");

type CheckStatus = "GREEN" | "YELLOW" | "RED";

interface CanaryCheck {
    id: string;
    label: string;
    status: CheckStatus;
    detail: string;
    checkedAt: string;
}

interface CanaryResponse {
    overall: CheckStatus;
    checks: CanaryCheck[];
    checkedAt: string;
}

function makeCheck(id: string, label: string, status: CheckStatus, detail: string): CanaryCheck {
    return { id, label, status, detail, checkedAt: new Date().toISOString() };
}

export async function GET(): Promise<NextResponse> {
    const authResult = await requireAdmin();
    if (!authResult.isAuthorized) {
        return authResult.response!;
    }

    const checks: CanaryCheck[] = [];

    // ── Check 1: Risk Monitor Heartbeat ──
    try {
        const redis = new Redis(process.env.REDIS_URL!);
        const heartbeat = await redis.get("worker:risk-monitor:heartbeat");
        redis.disconnect();

        if (!heartbeat) {
            checks.push(makeCheck("heartbeat", "Risk Monitor Heartbeat", "RED", "No heartbeat found in Redis — risk monitor may not be running"));
        } else {
            const ageMs = Date.now() - parseInt(heartbeat);
            const ageSec = Math.round(ageMs / 1000);
            if (ageSec <= 60) {
                checks.push(makeCheck("heartbeat", "Risk Monitor Heartbeat", "GREEN", `Last beat ${ageSec}s ago`));
            } else if (ageSec <= 300) {
                checks.push(makeCheck("heartbeat", "Risk Monitor Heartbeat", "YELLOW", `Stale: last beat ${ageSec}s ago (>60s)`));
            } else {
                checks.push(makeCheck("heartbeat", "Risk Monitor Heartbeat", "RED", `Dead: last beat ${ageSec}s ago (>5min)`));
            }
        }
    } catch (error: unknown) {
        checks.push(makeCheck("heartbeat", "Risk Monitor Heartbeat", "RED", `Redis error: ${error instanceof Error ? error.message : String(error)}`));
    }

    // ── Check 2: Position Price Coverage ──
    try {
        // Get all funded account positions
        const fundedChallenges = await db.select()
            .from(challenges)
            .where(and(eq(challenges.status, "active"), eq(challenges.phase, "funded")));

        if (fundedChallenges.length === 0) {
            checks.push(makeCheck("prices", "Position Price Coverage", "GREEN", "No funded accounts — nothing to price"));
        } else {
            // Collect all unique market IDs from funded positions
            const allMarketIds = new Set<string>();
            for (const ch of fundedChallenges) {
                const openPositions = await db.select({ marketId: positions.marketId })
                    .from(positions)
                    .where(and(eq(positions.challengeId, ch.id), eq(positions.status, "OPEN")));

                openPositions.forEach(p => allMarketIds.add(p.marketId));
            }

            if (allMarketIds.size === 0) {
                checks.push(makeCheck("prices", "Position Price Coverage", "GREEN", `${fundedChallenges.length} funded accounts, 0 open positions`));
            } else {
                // Try to price every position using the same chain as dashboard + risk monitor
                const prices = await MarketService.getBatchOrderBookPrices(Array.from(allMarketIds));
                const resolved = prices.size;
                const total = allMarketIds.size;
                const missing = total - resolved;

                if (missing === 0) {
                    checks.push(makeCheck("prices", "Position Price Coverage", "GREEN", `${resolved}/${total} positions priced (100%)`));
                } else {
                    checks.push(makeCheck("prices", "Position Price Coverage", "RED",
                        `${missing}/${total} positions UNRESOLVABLE — risk monitor is blind to these`));
                }
            }
        }
    } catch (error: unknown) {
        checks.push(makeCheck("prices", "Position Price Coverage", "RED", `Error: ${error instanceof Error ? error.message : String(error)}`));
    }

    // ── Check 3: Daily Reset Freshness ──
    try {
        const activeChallenges = await db.select({
            id: challenges.id,
            lastDailyResetAt: challenges.lastDailyResetAt,
            phase: challenges.phase,
        })
            .from(challenges)
            .where(eq(challenges.status, "active"));

        const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
        const staleResets = activeChallenges.filter(c =>
            !c.lastDailyResetAt || c.lastDailyResetAt < twentyFiveHoursAgo
        );

        if (staleResets.length === 0) {
            const latest = activeChallenges
                .map(c => c.lastDailyResetAt?.getTime() || 0)
                .reduce((a, b) => Math.max(a, b), 0);
            const hoursAgo = latest > 0 ? Math.round((Date.now() - latest) / 3600000) : 0;
            checks.push(makeCheck("reset", "Daily Reset", "GREEN", `All ${activeChallenges.length} accounts reset within 25h (latest: ${hoursAgo}h ago)`));
        } else {
            const fundedStale = staleResets.filter(c => c.phase === "funded").length;
            checks.push(makeCheck("reset", "Daily Reset", fundedStale > 0 ? "RED" : "YELLOW",
                `${staleResets.length} accounts missed reset (${fundedStale} funded)`));
        }
    } catch (error: unknown) {
        checks.push(makeCheck("reset", "Daily Reset", "RED", `DB error: ${error instanceof Error ? error.message : String(error)}`));
    }

    // ── Check 4: Order Book Freshness ──
    try {
        const books = await getAllOrderBooks() as Record<string, unknown> | null;
        if (!books) {
            checks.push(makeCheck("orderbooks", "Order Book Data", "RED", "Worker /orderbooks returned null — no market data"));
        } else {
            const count = Object.keys(books).length;
            if (count >= 500) {
                checks.push(makeCheck("orderbooks", "Order Book Data", "GREEN", `${count} tokens available`));
            } else if (count >= 100) {
                checks.push(makeCheck("orderbooks", "Order Book Data", "YELLOW", `Only ${count} tokens (expected 1000+)`));
            } else {
                checks.push(makeCheck("orderbooks", "Order Book Data", "RED", `Critical: only ${count} tokens available`));
            }
        }
    } catch (error: unknown) {
        checks.push(makeCheck("orderbooks", "Order Book Data", "RED", `Error: ${error instanceof Error ? error.message : String(error)}`));
    }

    // ── Check 5: Worker Reachability ──
    try {
        const health = await getIngestionHealth();
        if (health) {
            checks.push(makeCheck("worker", "Worker Reachability", "GREEN", "Railway worker responded to /health"));
        } else {
            checks.push(makeCheck("worker", "Worker Reachability", "RED", "Worker unreachable — /health returned null"));
        }
    } catch (error: unknown) {
        checks.push(makeCheck("worker", "Worker Reachability", "RED", `Error: ${error instanceof Error ? error.message : String(error)}`));
    }

    // ── Compute Overall Status ──
    const hasRed = checks.some(c => c.status === "RED");
    const hasYellow = checks.some(c => c.status === "YELLOW");
    const overall: CheckStatus = hasRed ? "RED" : hasYellow ? "YELLOW" : "GREEN";

    const response: CanaryResponse = {
        overall,
        checks,
        checkedAt: new Date().toISOString(),
    };

    logger.info(`Canary check: ${overall}`, { checks: checks.map(c => `${c.id}:${c.status}`) });

    return NextResponse.json(response);
}
