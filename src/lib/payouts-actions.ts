
"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { payouts, challenges } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function requestPayout(data: {
    amount: number;
    network: string;
    walletAddress: string;
}): Promise<{ success: true; payoutId: string }> {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    // TODO: Validate amount against available balance
    // For now, we just insert the request

    const payoutId = crypto.randomUUID();

    // MOCK DATA BYPASS FOR DEMO USER
    if (session.user.id.startsWith("demo-user")) {
        console.log("Mocking payout request for demo user");
        return { success: true, payoutId };
    }

    await db.insert(payouts).values({
        id: payoutId,
        userId: session.user.id,
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
    if (!session?.user?.id) return { available: 0, breakout: 300 };

    // MOCK DATA BYPASS FOR DEMO USER
    if (session.user.id.startsWith("demo-user")) {
        return {
            available: 12500.00,
            breakout: 300.00,
        };
    }

    // TODO: Implement real balance logic
    return {
        available: 0,
        breakout: 300,
    };
}
