/**
 * Payout Service
 * 
 * Handles payout eligibility, calculation, and request flow for funded accounts.
 * Ensures compliance with all funded stage rules before approving payouts.
 */

import { db } from "@/db";
import { challenges, payouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ResolutionDetector } from "./resolution-detector";
import { FUNDED_RULES, CONSISTENCY_CONFIG } from "./funded-rules";
import { nanoid } from "nanoid";

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
        const currentBalance = parseFloat(challenge.currentBalance);
        const startingBalance = parseFloat(challenge.startingBalance);
        const netProfit = currentBalance - startingBalance;

        if (netProfit <= 0) {
            reasons.push(`No net profit (balance: $${currentBalance.toFixed(2)}, starting: $${startingBalance.toFixed(2)})`);
        }

        // Check 4: Minimum trading days
        const activeTradingDays = challenge.activeTradingDays || 0;
        const minDays = FUNDED_RULES["10k"].minTradingDays; // Default to 5

        if (activeTradingDays < minDays) {
            reasons.push(`Insufficient trading days (${activeTradingDays}/${minDays} required)`);
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

        const currentBalance = parseFloat(challenge.currentBalance);
        const startingBalance = parseFloat(challenge.startingBalance);

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
        const payoutCap = parseFloat(challenge.payoutCap || challenge.startingBalance);
        const cappedProfit = Math.min(adjustedProfit, payoutCap);

        // 5. Apply profit split
        const profitSplit = parseFloat(challenge.profitSplit || "0.80");
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

        // Reset cycle tracking on the challenge
        await db.update(challenges)
            .set({
                lastPayoutAt: now,
                payoutCycleStart: now,
                activeTradingDays: 0,
                consistencyFlagged: false,
            })
            .where(eq(challenges.id, challengeId));

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
        await db.update(payouts)
            .set({
                status: "approved",
                approvedBy: adminId,
            })
            .where(eq(payouts.id, payoutId));

        console.log(`[PayoutService] Payout ${payoutId} approved by ${adminId}`);
    }

    /**
     * Mark payout as processing (crypto transaction initiated).
     */
    static async markProcessing(payoutId: string): Promise<void> {
        await db.update(payouts)
            .set({ status: "processing" })
            .where(eq(payouts.id, payoutId));
    }

    /**
     * Mark payout as completed (crypto transaction confirmed).
     */
    static async completePayout(payoutId: string, transactionHash: string): Promise<void> {
        const now = new Date();

        // Get payout to update challenge totals
        const [payout] = await db.select().from(payouts).where(eq(payouts.id, payoutId));

        if (payout) {
            // Update challenge total paid out
            const [challenge] = await db.select().from(challenges).where(eq(challenges.id, payout.challengeId!));
            if (challenge) {
                const totalPaid = parseFloat(challenge.totalPaidOut || "0") + parseFloat(payout.amount);
                await db.update(challenges)
                    .set({ totalPaidOut: totalPaid.toFixed(2) })
                    .where(eq(challenges.id, payout.challengeId!));
            }
        }

        await db.update(payouts)
            .set({
                status: "completed",
                processedAt: now,
                transactionHash,
            })
            .where(eq(payouts.id, payoutId));

        console.log(`[PayoutService] Payout ${payoutId} completed: ${transactionHash}`);
    }

    /**
     * Mark payout as failed.
     */
    static async failPayout(payoutId: string, reason: string): Promise<void> {
        await db.update(payouts)
            .set({
                status: "failed",
                failureReason: reason,
            })
            .where(eq(payouts.id, payoutId));

        console.log(`[PayoutService] Payout ${payoutId} failed: ${reason}`);
    }
}
