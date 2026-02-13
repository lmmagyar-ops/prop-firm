
import { db } from "@/db";
import { users, challenges, payouts, trades } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { Challenge } from "@/types/user";
import { computeBestMarketCategory } from "@/lib/dashboard-service";

export async function getPrivateProfileData(userId: string) {
    // Demo users have no real profile data
    if (userId.startsWith("demo-user")) {
        return null;
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

    // 3. Get completed payouts for lifetime withdrawn calculation
    const completedPayouts = await db.query.payouts.findMany({
        where: and(
            eq(payouts.userId, userId),
            eq(payouts.status, "completed")
        ),
    });

    const lifetimeProfitWithdrawn = completedPayouts.reduce((sum, p) =>
        sum + parseFloat(p.amount), 0
    );

    // 4. Get all trades for user's challenges to calculate actual trading volume
    const challengeIds = allChallenges.map(c => c.id);
    const allTrades = challengeIds.length > 0
        ? await db.query.trades.findMany({
            where: inArray(trades.challengeId, challengeIds),
        })
        : [];

    // 5. Fetch market titles for category classification
    const sellTrades = allTrades.filter(t => t.realizedPnL !== null);
    const sellMarketIds = [...new Set(sellTrades.map(t => t.marketId))];
    const { MarketService } = await import("./market");
    const marketTitles = sellMarketIds.length > 0
        ? await MarketService.getBatchTitles(sellMarketIds)
        : new Map<string, string>();

    // 6. Calculate metrics with actual trade data
    const metrics = calculateMetrics(allChallenges, lifetimeProfitWithdrawn, allTrades, marketTitles);

    // 7. Format accounts
    const accounts = allChallenges.map((c, idx) => ({
        id: c.id,
        date: c.startedAt || new Date(),
        accountNumber: `CH-${c.startedAt ? new Date(c.startedAt).getFullYear() : 'XXXX'}-${String(idx + 1).padStart(3, '0')}`,
        accountType: `$${parseFloat(c.startingBalance).toLocaleString()} Challenge`,
        status: c.status,
    }));

    // 7. Get socials
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
        isPublic: true, // FUTURE(v2): per-account visibility from DB
        showDropdown: true, // FUTURE(v2): per-account dropdown toggle from DB
    }));

    return {
        ...data,
        accounts: accountsWithVisibility,
        showOnLeaderboard,
    };
}

interface TradeRecord {
    id: string;
    marketId: string;
    challengeId: string | null;
    amount: string;
    realizedPnL: string | null;
}

function calculateMetrics(challenges: Challenge[], lifetimeProfitWithdrawn: number, allTrades: TradeRecord[], marketTitles: Map<string, string>) {
    // Calculate ACTUAL trading volume from trades (sum of all trade amounts)
    const lifetimeTradingVolume = allTrades.reduce((sum, t) =>
        sum + parseFloat(t.amount || "0"), 0
    );

    // Get funded challenge IDs
    const fundedChallenges = challenges.filter(c => c.status === 'passed');
    const fundedChallengeIds = new Set(fundedChallenges.map(c => c.id));

    // Calculate funded volume from trades on funded challenges
    const fundedTradingVolume = allTrades
        .filter(t => t.challengeId && fundedChallengeIds.has(t.challengeId))
        .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);

    // Calculate withdrawable profit from active funded accounts
    const activeFundedChallenges = challenges.filter(c =>
        c.status === 'active'
    );

    const currentWithdrawableProfit = activeFundedChallenges.reduce((sum, c) => {
        const profit = parseFloat(c.currentBalance) - parseFloat(c.startingBalance);
        const profitSplit = parseFloat((c as unknown as Record<string, string>).profitSplit || "0.80");
        const withdrawable = Math.max(0, profit * profitSplit);
        return sum + withdrawable;
    }, 0);

    // Calculate win rate from trades with realized P&L
    const tradesWithPnL = allTrades.filter(t => t.realizedPnL !== null);
    const winningTrades = tradesWithPnL.filter(t => parseFloat(t.realizedPnL || "0") > 0).length;
    const totalTradesWithPnL = tradesWithPnL.length;
    const tradingWinRate = totalTradesWithPnL > 0 ? (winningTrades / totalTradesWithPnL) * 100 : 0;

    return {
        lifetimeTradingVolume,
        fundedTradingVolume,
        currentWithdrawableProfit,
        highestWinRateAsset: computeBestMarketCategory(tradesWithPnL, marketTitles),
        tradingWinRate,
        lifetimeProfitWithdrawn,
    };
}
