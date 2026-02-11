/**
 * Payout Service
 * 
 * Handles payout eligibility, calculation, and request flow for funded accounts.
 * Ensures compliance with all funded stage rules before approving payouts.
 */

import { db } from "@/db";
import { challenges, payouts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { ResolutionDetector } from "./resolution-detector";
import { FUNDED_RULES, FundedTier } from "./funded-rules";
import { nanoid } from "nanoid";
import { safeParseFloat } from "./safe-parse";
import { BalanceManager } from "./trading/BalanceManager";

// Types
export interface PayoutEligibility {
    eligible: boolean;
    reasons: string[];
    netProfit: number;
    activeTradingDays: number;
    consistencyFlagged: boolean;
}

export interface PayoutCalculation {
    grossProfit: number;           // Total profit before exclusions
    excludedPnl: number;           // P&L excluded due to resolution events
    adjustedProfit: number;        // After exclusions
    payoutCap: number;             // Max payout allowed
    cappedProfit: number;          // After cap applied
    profitSplit: number;           // Split percentage (0.80 or 0.90)
    netPayout: number;             // Final payout to trader
    firmShare: number;             // Firm's share
}

export interface PayoutRequest {
    payoutId: string;
    challengeId: string;
    userId: string;
    amount: number;
    status: "pending" | "approved" | "processing" | "completed" | "failed";
}

export class PayoutService {

    /**
     * Check if a funded account is eligible for payout.
     * Must pass all checks:
     * 1. Must be funded phase
     * 2. Must have net profit
     * 3. Must have ≥5 active trading days in cycle
     * 4. Can be consistency flagged (soft flag = review, not rejection)
     * 5. No active rule violations
     */
    static async checkEligibility(challengeId: string): Promise<PayoutEligibility> {
        const reasons: string[] = [];

        // Get challenge
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId));

        if (!challenge) {
            return { eligible: false, reasons: ["Challenge not found"], netProfit: 0, activeTradingDays: 0, consistencyFlagged: false };
        }

        // Check 1: Must be funded phase
        if (challenge.phase !== "funded") {
            reasons.push(`Not a funded account (phase: ${challenge.phase})`);
        }

        // Check 2: Must be active status
        if (challenge.status !== "active") {
            reasons.push(`Account is not active (status: ${challenge.status})`);
        }

        // Check 3: Calculate net profit
        const currentBalance = safeParseFloat(challenge.currentBalance);
        const startingBalance = safeParseFloat(challenge.startingBalance);
        const netProfit = currentBalance - startingBalance;

        if (netProfit <= 0) {
            reasons.push(`No net profit (balance: $${currentBalance.toFixed(2)}, starting: $${startingBalance.toFixed(2)})`);
        }

        // Check 4: Minimum trading days (use actual tier, not hard-coded)
        const activeTradingDays = challenge.activeTradingDays || 0;
        const tier = this.getFundedTier(startingBalance);
        const minDays = FUNDED_RULES[tier].minTradingDays;

        if (activeTradingDays < minDays) {
            reasons.push(`Insufficient trading days (${activeTradingDays}/${minDays} required)`);
        }

        // Check 6: No pending/in-progress payout already exists
        const existingPayouts = await db.select().from(payouts)
            .where(and(
                eq(payouts.challengeId, challengeId),
                inArray(payouts.status, ['pending', 'approved', 'processing'])
            ));
        if (existingPayouts.length > 0) {
            reasons.push(`Existing payout already in progress (status: ${existingPayouts[0].status})`);
        }

        // Check 5: Consistency flag (soft - doesn't block, but noted)
        const consistencyFlagged = challenge.consistencyFlagged || false;
        if (consistencyFlagged) {
            reasons.push(`Consistency flag active (requires admin review)`);
        }

        return {
            eligible: reasons.filter(r => !r.includes("Consistency flag")).length === 0,
            reasons,
            netProfit,
            activeTradingDays,
            consistencyFlagged
        };
    }

    /**
     * Calculate the payout amount with all deductions and caps.
     */
    static async calculatePayout(challengeId: string): Promise<PayoutCalculation> {
        // Get challenge
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId));

        if (!challenge) {
            throw new Error("Challenge not found");
        }

        const currentBalance = safeParseFloat(challenge.currentBalance);
        const startingBalance = safeParseFloat(challenge.startingBalance);

        // 1. Gross profit
        const grossProfit = Math.max(0, currentBalance - startingBalance);

        // 2. Get excluded P&L from resolution events
        const { totalExcluded } = await ResolutionDetector.getExcludedPnL(
            challengeId,
            challenge.payoutCycleStart || undefined
        );
        const excludedPnl = Math.max(0, totalExcluded); // Only exclude gains, not losses

        // 3. Adjusted profit
        const adjustedProfit = Math.max(0, grossProfit - excludedPnl);

        // 4. Apply payout cap (max = starting balance or stored cap)
        const payoutCap = safeParseFloat(challenge.payoutCap || challenge.startingBalance);
        const cappedProfit = Math.min(adjustedProfit, payoutCap);

        // 5. Apply profit split
        const profitSplit = safeParseFloat(challenge.profitSplit, 0.80);
        const netPayout = cappedProfit * profitSplit;
        const firmShare = cappedProfit - netPayout;

        console.log(`[PayoutService] Calculation for ${challengeId.slice(0, 8)}:`, {
            grossProfit: grossProfit.toFixed(2),
            excludedPnl: excludedPnl.toFixed(2),
            adjustedProfit: adjustedProfit.toFixed(2),
            payoutCap: payoutCap.toFixed(2),
            cappedProfit: cappedProfit.toFixed(2),
            profitSplit: `${(profitSplit * 100).toFixed(0)}%`,
            netPayout: netPayout.toFixed(2),
            firmShare: firmShare.toFixed(2)
        });

        return {
            grossProfit,
            excludedPnl,
            adjustedProfit,
            payoutCap,
            cappedProfit,
            profitSplit,
            netPayout,
            firmShare
        };
    }

    /**
     * Request a payout (creates pending payout record).
     * Payout must be approved by admin before processing.
     */
    static async requestPayout(
        challengeId: string,
        walletAddress: string,
        network: "ERC20" | "POLYGON" | "SOLANA" = "POLYGON"
    ): Promise<PayoutRequest> {
        // Check eligibility
        const eligibility = await this.checkEligibility(challengeId);
        if (!eligibility.eligible) {
            throw new Error(`Payout not eligible: ${eligibility.reasons.join(", ")}`);
        }

        // Calculate payout
        const calculation = await this.calculatePayout(challengeId);
        if (calculation.netPayout <= 0) {
            throw new Error("No payout amount calculated");
        }

        // Get challenge for user ID
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId));

        if (!challenge) {
            throw new Error("Challenge not found");
        }

        // Create payout record
        const payoutId = nanoid(16);
        const now = new Date();

        await db.insert(payouts).values({
            id: payoutId,
            userId: challenge.userId!,
            challengeId: challengeId,
            amount: calculation.netPayout.toFixed(2),
            network,
            walletAddress,
            status: "pending",
            requestedAt: now,
            cycleStart: challenge.payoutCycleStart || challenge.startedAt,
            cycleEnd: now,
            grossProfit: calculation.grossProfit.toFixed(2),
            excludedPnl: calculation.excludedPnl.toFixed(2),
            profitSplit: calculation.profitSplit.toFixed(2),
        });

        // NOTE: Cycle reset moved to completePayout() — only reset after
        // payout is actually completed, not just requested. This prevents
        // losing trading day progress if payout is rejected.

        console.log(`[PayoutService] Payout requested: ${payoutId} for $${calculation.netPayout.toFixed(2)}`);

        return {
            payoutId,
            challengeId,
            userId: challenge.userId!,
            amount: calculation.netPayout,
            status: "pending"
        };
    }

    /**
     * Admin approves a pending payout.
     */
    static async approvePayout(payoutId: string, adminId: string): Promise<void> {
        // Pre-check: payout must exist and be in 'pending' status
        const [existing] = await db.select().from(payouts)
            .where(eq(payouts.id, payoutId));

        if (!existing) {
            throw new Error(`Payout ${payoutId} not found`);
        }
        if (existing.status !== 'pending') {
            throw new Error(`Cannot approve payout ${payoutId}: status is '${existing.status}', expected 'pending'`);
        }

        await db.update(payouts)
            .set({
                status: "approved",
                approvedBy: adminId,
            })
            .where(and(
                eq(payouts.id, payoutId),
                eq(payouts.status, "pending")
            ));

        console.log(`[PayoutService] Payout ${payoutId} approved by ${adminId}`);
    }

    /**
     * Mark payout as processing (crypto transaction initiated).
     */
    static async markProcessing(payoutId: string): Promise<void> {
        // Pre-check: payout must exist and be in 'approved' status
        const [existing] = await db.select().from(payouts)
            .where(eq(payouts.id, payoutId));

        if (!existing) {
            throw new Error(`Payout ${payoutId} not found`);
        }
        if (existing.status !== 'approved') {
            throw new Error(`Cannot process payout ${payoutId}: status is '${existing.status}', expected 'approved'`);
        }

        await db.update(payouts)
            .set({ status: "processing" })
            .where(and(
                eq(payouts.id, payoutId),
                eq(payouts.status, "approved")
            ));

        console.log(`[PayoutService] Payout ${payoutId} marked as processing`);
    }

    /**
     * Mark payout as completed (crypto transaction confirmed).
     * 
     * TRANSACTION SAFETY: All mutations (balance deduction, challenge update,
     * payout status) are atomic. If any step fails, everything rolls back.
     * 
     * CRITICAL: Deducts the gross profit (cappedProfit = pre-split amount) from
     * the trader's balance. Without this, the same profit could be paid out
     * repeatedly — an infinite payout exploit.
     * 
     * We deduct cappedProfit (not netPayout) because:
     * - netPayout = trader's share (e.g., 80%)
     * - firmShare = firm's share (e.g., 20%)
     * - cappedProfit = netPayout + firmShare
     * The entire profit is removed from the trading balance on payout.
     */
    static async completePayout(payoutId: string, transactionHash: string): Promise<void> {
        const now = new Date();

        // Pre-fetch outside transaction (read-only)
        const [payout] = await db.select().from(payouts)
            .where(and(
                eq(payouts.id, payoutId),
                eq(payouts.status, "processing")  // Guard: only complete processing payouts
            ));

        if (!payout) {
            throw new Error(`Payout ${payoutId} not found or not in 'processing' status`);
        }

        const [challenge] = await db.select().from(challenges)
            .where(eq(challenges.id, payout.challengeId!));

        if (!challenge) {
            throw new Error(`Challenge ${payout.challengeId} not found for payout ${payoutId}`);
        }

        // Calculate the gross profit amount to deduct from balance.
        // This is the full cappedProfit (pre-split), not just the trader's netPayout.
        // grossProfit is stored on the payout record; profitSplit gives us the ratio.
        const payoutAmount = safeParseFloat(payout.amount);      // netPayout (trader's share)
        const profitSplit = safeParseFloat(payout.profitSplit, 0.80);
        // Reverse the split to get the full profit: netPayout / split = cappedProfit
        const grossDeduction = profitSplit > 0 ? payoutAmount / profitSplit : payoutAmount;

        const totalPaid = safeParseFloat(challenge.totalPaidOut) + payoutAmount;

        // ATOMIC: balance deduction + challenge update + payout status update
        await db.transaction(async (tx) => {
            // 1. Deduct gross profit from trader's balance via BalanceManager
            //    This is the critical fix — without it, the same profit could be
            //    paid out repeatedly.
            await BalanceManager.deductCost(
                tx, challenge.id, grossDeduction, 'payout_completion'
            );

            // 2. Update challenge: total paid + cycle reset
            await tx.update(challenges)
                .set({
                    totalPaidOut: totalPaid.toFixed(2),
                    lastPayoutAt: now,
                    payoutCycleStart: now,
                    activeTradingDays: 0,
                    consistencyFlagged: false,
                })
                .where(eq(challenges.id, challenge.id));

            // 3. Mark payout as completed
            await tx.update(payouts)
                .set({
                    status: "completed",
                    processedAt: now,
                    transactionHash,
                })
                .where(eq(payouts.id, payoutId));
        });

        console.log(`[PayoutService] Payout ${payoutId} completed: ${transactionHash} | Deducted $${grossDeduction.toFixed(2)} from balance`);
    }

    /**
     * Mark payout as failed.
     */
    static async failPayout(payoutId: string, reason: string): Promise<void> {
        // Pre-check: payout must exist and be in a non-terminal status
        const [existing] = await db.select().from(payouts)
            .where(eq(payouts.id, payoutId));

        if (!existing) {
            throw new Error(`Payout ${payoutId} not found`);
        }
        if (existing.status === 'completed' || existing.status === 'failed') {
            throw new Error(`Cannot fail payout ${payoutId}: status is '${existing.status}' (already terminal)`);
        }

        await db.update(payouts)
            .set({
                status: "failed",
                failureReason: reason,
            })
            .where(and(
                eq(payouts.id, payoutId),
                inArray(payouts.status, ['pending', 'approved', 'processing'])
            ));

        console.log(`[PayoutService] Payout ${payoutId} failed: ${reason}`);
    }

    /**
     * Determine the funded tier based on starting balance.
     */
    private static getFundedTier(startingBalance: number): FundedTier {
        if (startingBalance >= 25000) return '25k';
        if (startingBalance >= 10000) return '10k';
        return '5k';
    }
}
