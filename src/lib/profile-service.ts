
import { db } from "@/db";
import { users, challenges } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Challenge } from "@/types/user";

export async function getPrivateProfileData(userId: string) {
    // MOCK DATA BYPASS FOR DEMO USER
    if (userId.startsWith("demo-user")) {
        return {
            user: {
                id: userId,
                displayName: "Demo Trader",
                email: "demo@projectx.com",
                image: null,
                createdAt: new Date(),
                emailVerified: new Date(),
                showOnLeaderboard: true,
            } as any, // Cast to avoid full type matching for demo
            metrics: {
                lifetimeTradingVolume: 1500000,
                fundedTradingVolume: 500000,
                currentWithdrawableProfit: 12500,
                highestWinRateAsset: "Politics",
                tradingWinRate: 68.5,
                lifetimeProfitWithdrawn: 5000,
            },
            accounts: [
                {
                    id: "acc-1",
                    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    accountNumber: "CH-2024-001",
                    accountType: "$50,000 Challenge",
                    status: "passed",
                },
                {
                    id: "acc-2",
                    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    accountNumber: "CH-2024-002",
                    accountType: "$100,000 Challenge",
                    status: "active",
                }
            ],
            socials: {
                twitter: "demotrader",
                discord: "demo#1234",
            }
        };
    }

    // 1. Get user
    const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
    });

    if (!user) return null;

    // 2. Get all challenges
    const allChallenges = await db.query.challenges.findMany({
        where: eq(challenges.userId, userId),
    }) as Challenge[];

    // 3. Calculate metrics
    const metrics = calculateMetrics(allChallenges);

    // 4. Format accounts
    const accounts = allChallenges.map((c, idx) => ({
        id: c.id,
        date: c.startedAt || new Date(),
        accountNumber: `CH-${c.startedAt ? new Date(c.startedAt).getFullYear() : 'XXXX'}-${String(idx + 1).padStart(3, '0')}`,
        accountType: `$${parseFloat(c.startingBalance).toLocaleString()} Challenge`,
        status: c.status,
    }));

    // 5. Get socials (placeholder)
    const socials = {
        twitter: user.twitter || undefined,
        discord: user.discord || undefined,
        telegram: user.telegram || undefined,
    };

    return { user, metrics, accounts, socials };
}

export async function getPublicProfileData(userId: string) {
    const data = await getPrivateProfileData(userId);

    if (!data) return null;

    // Add public-specific fields
    const showOnLeaderboard = data.user.showOnLeaderboard || false;

    // Add visibility flags to accounts
    const accountsWithVisibility = data.accounts.map(acc => ({
        ...acc,
        isPublic: true, // TODO: Get from DB
        showDropdown: true, // TODO: Get from DB
    }));

    return {
        ...data,
        accounts: accountsWithVisibility,
        showOnLeaderboard,
    };
}

function calculateMetrics(challenges: Challenge[]) {
    // Calculate from challenges data
    const totalVolume = challenges.reduce((sum, c) =>
        sum + parseFloat(c.startingBalance), 0
    );

    const fundedChallenges = challenges.filter(c => c.status === 'passed');
    const fundedVolume = fundedChallenges.reduce((sum, c) =>
        sum + parseFloat(c.startingBalance), 0
    );

    const totalProfit = challenges.reduce((sum, c) => {
        const profit = parseFloat(c.currentBalance) - parseFloat(c.startingBalance);
        return sum + Math.max(0, profit);
    }, 0);

    // TODO: Calculate from actual trade data
    const winningTrades = 0;
    const totalTrades = 1;
    const tradingWinRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
        lifetimeTradingVolume: totalVolume,
        fundedTradingVolume: fundedVolume,
        currentWithdrawableProfit: 0, // TODO: Calculate from funded accounts
        highestWinRateAsset: "Politics", // TODO: Calculate from trade history
        tradingWinRate,
        lifetimeProfitWithdrawn: 0, // TODO: Get from payouts table
    };
}
