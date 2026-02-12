
"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { payouts, challenges } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createLogger } from "@/lib/logger";

const logger = createLogger("PayoutActions");

export async function requestPayout(data: {
    amount: number;
    network: string;
    walletAddress: string;
}): Promise<{ success: true; payoutId: string }> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // --- Input validation ---
    if (!data.amount || data.amount <= 0) {
        throw new Error("Payout amount must be greater than zero");
    }
    if (data.amount < 100) {
        throw new Error("Minimum payout is $100.00");
    }
    if (!data.walletAddress || data.walletAddress.trim().length === 0) {
        throw new Error("Wallet address is required");
    }
    const validNetworks = ["ERC20", "POLYGON", "SOLANA"];
    if (!validNetworks.includes(data.network)) {
        throw new Error(`Invalid network. Must be one of: ${validNetworks.join(", ")}`);
    }

    const payoutId = crypto.randomUUID();

    // MOCK DATA BYPASS FOR DEMO USER
    if (session.user.id.startsWith("demo-user")) {
        logger.info("Mocking payout request for demo user", { payoutId });
        return { success: true, payoutId };
    }

    // --- Server-side balance validation ---
    // Find the user's active funded challenge
    const fundedChallenge = await db.query.challenges.findFirst({
        where: and(
            eq(challenges.userId, session.user.id),
            eq(challenges.phase, "funded"),
            eq(challenges.status, "active")
        ),
    });

    if (!fundedChallenge) {
        throw new Error("No active funded account found. Only funded accounts can request payouts.");
    }

    const currentBalance = parseFloat(fundedChallenge.currentBalance);
    const startingBalance = parseFloat(fundedChallenge.startingBalance);
    const profit = currentBalance - startingBalance;

    if (profit <= 0) {
        throw new Error("No profit available for payout. Current balance is at or below starting balance.");
    }

    // Payout amount cannot exceed profit
    // (In practice the PayoutService calculates exact amounts with profit split,
    //  but this guards against obviously invalid requests)
    if (data.amount > profit) {
        throw new Error(
            `Requested payout ($${data.amount.toFixed(2)}) exceeds available profit ($${profit.toFixed(2)}).`
        );
    }

    logger.info("Payout request validated", {
        userId: session.user.id.slice(0, 8),
        challengeId: fundedChallenge.id.slice(0, 8),
        amount: data.amount,
        currentBalance,
        profit,
    });

    await db.insert(payouts).values({
        id: payoutId,
        userId: session.user.id,
        challengeId: fundedChallenge.id,
        amount: data.amount.toString(),
        network: data.network,
        walletAddress: data.walletAddress,
        status: "pending",
    });

    revalidatePath("/dashboard/payouts");
    return { success: true, payoutId };
}

export async function getPayoutsHistory(): Promise<Array<{
    id: string;
    userId: string;
    amount: number;
    network: string;
    walletAddress: string;
    status: string;
    date: Date;
}>> {
    const session = await auth();
    if (!session?.user?.id) return [];

    // MOCK DATA BYPASS FOR DEMO USER
    if (session.user.id.startsWith("demo-user")) {
        return [
            {
                id: "pay-1",
                userId: session.user.id,
                amount: 5000,
                network: "ETH",
                walletAddress: "0x123...abc",
                status: "completed",
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            },
            {
                id: "pay-2",
                userId: session.user.id,
                amount: 2500,
                network: "USDC",
                walletAddress: "0x456...def",
                status: "processing",
                date: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
            }
        ];
    }

    const history = await db.query.payouts.findMany({
        where: eq(payouts.userId, session.user.id),
        orderBy: [desc(payouts.requestedAt)],
    });

    return history.map(p => ({
        ...p,
        amount: parseFloat(p.amount),
        date: p.requestedAt,
    }));
}

export async function getAvailableBalance(): Promise<{ available: number; breakout: number }> {
    const session = await auth();
    if (!session?.user?.id) return { available: 0, breakout: 0 };

    // MOCK DATA BYPASS FOR DEMO USER
    if (session.user.id.startsWith("demo-user")) {
        return {
            available: 12500.00,
            breakout: 300.00,
        };
    }

    // Query the user's active funded challenge for real balance
    const fundedChallenge = await db.query.challenges.findFirst({
        where: and(
            eq(challenges.userId, session.user.id),
            eq(challenges.phase, "funded"),
            eq(challenges.status, "active")
        ),
    });

    if (!fundedChallenge) {
        return { available: 0, breakout: 0 };
    }

    const currentBalance = parseFloat(fundedChallenge.currentBalance);
    const startingBalance = parseFloat(fundedChallenge.startingBalance);
    const profit = Math.max(0, currentBalance - startingBalance);

    // Profit split: user gets their split percentage (default 80%)
    const profitSplit = parseFloat(fundedChallenge.profitSplit || "0.80");
    const availableProfit = profit * profitSplit;

    return {
        available: Math.round(availableProfit * 100) / 100, // Round to cents
        breakout: Math.round(profit * 100) / 100,
    };
}
