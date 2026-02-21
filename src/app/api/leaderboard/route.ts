import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trades, users, challenges } from "@/db/schema";
import { eq, sql, and, ne, isNotNull } from "drizzle-orm";
import { auth } from "@/auth";
import { createLogger } from "@/lib/logger";

const logger = createLogger("Leaderboard");

/**
 * GET /api/leaderboard
 *
 * Returns ranked traders based on real trading data.
 * Computes volume (SUM of trade amounts) and profit (SUM of realized PnL)
 * from the trades table, respecting user privacy settings.
 *
 * Query params:
 *   sort: "profit" (default) | "volume"
 *   page: 1-indexed page number
 *   limit: items per page (default 20, max 50)
 *
 * Response includes:
 *   - entries: ranked trader list
 *   - myStats: current user's own rank/stats (if authenticated)
 *   - totalTraders: count of eligible traders
 *   - meta: pagination info
 */

interface LeaderboardEntry {
    rank: number;
    userId: string;
    displayName: string;
    image: string | null;
    country: string | null;
    tradingVolume: number;
    totalProfit: number;
    leaderboardPrivacy: string;
    showCountry: boolean;
    showStatsPublicly: boolean;
}

interface LeaderboardResponse {
    entries: LeaderboardEntry[];
    myStats: {
        rank: number;
        tradingVolume: number;
        totalProfit: number;
    } | null;
    totalTraders: number;
    meta: {
        page: number;
        pageSize: number;
        totalPages: number;
    };
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sort = searchParams.get("sort") === "volume" ? "volume" : "profit";
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
        const offset = (page - 1) * limit;

        // Get current user for "Your Stats" card
        const session = await auth();
        const currentUserEmail = session?.user?.email;

        // Core leaderboard query: aggregate trades per user
        // Only include users who haven't opted out (not fully_private)
        // Only include users with at least 1 realized trade (SELL with PnL)
        const orderColumn = sort === "volume"
            ? sql`trading_volume DESC`
            : sql`total_profit DESC`;

        const leaderboardQuery = sql`
            WITH trader_stats AS (
                SELECT
                    t.challenge_id,
                    c.user_id,
                    SUM(CAST(t.amount AS NUMERIC)) as trade_volume,
                    SUM(CASE WHEN t.realized_pnl IS NOT NULL THEN CAST(t.realized_pnl AS NUMERIC) ELSE 0 END) as trade_profit
                FROM trades t
                JOIN challenges c ON c.id = t.challenge_id
                WHERE t.type = 'SELL'
                  AND t.realized_pnl IS NOT NULL
                GROUP BY t.challenge_id, c.user_id
            ),
            user_totals AS (
                SELECT
                    ts.user_id,
                    SUM(ts.trade_volume) as trading_volume,
                    SUM(ts.trade_profit) as total_profit
                FROM trader_stats ts
                GROUP BY ts.user_id
            ),
            ranked AS (
                SELECT
                    ut.user_id,
                    ut.trading_volume,
                    ut.total_profit,
                    COALESCE(u.display_name, u.name, 'Trader') as display_name,
                    u.image,
                    u.country,
                    u.leaderboard_privacy,
                    u.show_country,
                    u.show_stats_publicly,
                    ROW_NUMBER() OVER (ORDER BY ${orderColumn}) as rank
                FROM user_totals ut
                JOIN users u ON u.id = ut.user_id
                WHERE u.leaderboard_privacy != 'fully_private'
            )
            SELECT * FROM ranked
            ORDER BY rank ASC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const countQuery = sql`
            WITH trader_stats AS (
                SELECT
                    c.user_id,
                    SUM(CASE WHEN t.realized_pnl IS NOT NULL THEN CAST(t.realized_pnl AS NUMERIC) ELSE 0 END) as trade_profit
                FROM trades t
                JOIN challenges c ON c.id = t.challenge_id
                WHERE t.type = 'SELL'
                  AND t.realized_pnl IS NOT NULL
                GROUP BY c.user_id
            )
            SELECT COUNT(DISTINCT ts.user_id) as total
            FROM trader_stats ts
            JOIN users u ON u.id = ts.user_id
            WHERE u.leaderboard_privacy != 'fully_private'
        `;

        const [leaderboardRows, countRows] = await Promise.all([
            db.execute(leaderboardQuery),
            db.execute(countQuery),
        ]);

        const totalTraders = Number((countRows[0] as Record<string, unknown>)?.total || 0);
        const totalPages = Math.ceil(totalTraders / limit);

        const entries: LeaderboardEntry[] = (leaderboardRows as Record<string, unknown>[]).map((row: Record<string, unknown>) => ({
            rank: Number(row.rank),
            userId: String(row.user_id),
            displayName: String(row.display_name || "Trader"),
            image: row.image as string | null,
            country: row.country as string | null,
            tradingVolume: Number(row.trading_volume || 0),
            totalProfit: Number(row.total_profit || 0),
            leaderboardPrivacy: String(row.leaderboard_privacy || "semi_private"),
            showCountry: Boolean(row.show_country),
            showStatsPublicly: Boolean(row.show_stats_publicly),
        }));

        // Get current user's stats if authenticated
        let myStats: LeaderboardResponse["myStats"] = null;
        if (currentUserEmail) {
            const currentUser = await db.query.users.findFirst({
                where: eq(users.email, currentUserEmail),
            });

            if (currentUser) {
                const myStatsQuery = sql`
                    WITH trader_stats AS (
                        SELECT
                            c.user_id,
                            SUM(CAST(t.amount AS NUMERIC)) as trading_volume,
                            SUM(CASE WHEN t.realized_pnl IS NOT NULL THEN CAST(t.realized_pnl AS NUMERIC) ELSE 0 END) as total_profit
                        FROM trades t
                        JOIN challenges c ON c.id = t.challenge_id
                        WHERE t.type = 'SELL'
                          AND t.realized_pnl IS NOT NULL
                        GROUP BY c.user_id
                    ),
                    ranked AS (
                        SELECT
                            user_id,
                            trading_volume,
                            total_profit,
                            ROW_NUMBER() OVER (ORDER BY ${orderColumn}) as rank
                        FROM trader_stats
                    )
                    SELECT rank, trading_volume, total_profit
                    FROM ranked
                    WHERE user_id = ${currentUser.id}
                `;

                const myStatsRows = await db.execute(myStatsQuery);
                if (myStatsRows.length > 0) {
                    const row = myStatsRows[0] as Record<string, unknown>;
                    myStats = {
                        rank: Number(row.rank),
                        tradingVolume: Number(row.trading_volume || 0),
                        totalProfit: Number(row.total_profit || 0),
                    };
                }
            }
        }

        const response: LeaderboardResponse = {
            entries,
            myStats,
            totalTraders,
            meta: { page, pageSize: limit, totalPages },
        };

        return NextResponse.json(response, {
            headers: {
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
            },
        });
    } catch (error) {
        logger.error("Leaderboard API error:", error);

        // Graceful fallback — leaderboard should never crash the page
        return NextResponse.json(
            {
                entries: [],
                myStats: null,
                totalTraders: 0,
                meta: { page: 1, pageSize: 20, totalPages: 0 },
            } satisfies LeaderboardResponse,
            { status: 200 }
        );
    }
}
