import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./schema";

// ── WHY TWO CLIENTS ──────────────────────────────────────────────────────────
//
// PROBLEM (Sentry issue IDs e851b5f5, 1d30cd54, et al — 581/712 errors this week):
//   postgres.js uses a persistent TCP/TLS pool. On Vercel serverless, Neon
//   kills idle connections server-side. When a query fires on a dead TCP socket,
//   postgres.js throws: "Failed to connect to upstream database" with
//   TLSWrap.onStreamRead in the stack trace. This happened 581 times in 7 days.
//
// SOLUTION: Split into two clients based on use-case:
//
//   1. `db` — Neon HTTP driver (drizzle-orm/neon-http)
//      • Stateless HTTPS POST per query. No pool, no idle timeout, no TCP drops.
//      • Used by: ALL read queries, getDashboardData(), /api/user/balance,
//        /api/trade/positions, leaderboard, settings, etc.
//      • Eliminates the "Failed to connect" error class entirely for reads.
//
//   2. `dbPool` — Neon WebSocket Pool (drizzle-orm/neon-serverless)
//      • Maintains a connection for the duration of db.transaction() callbacks.
//      • Required for: db.transaction() (13 call sites across trade, risk,
//        admin, payout, settlement, evaluator, fees).
//      • Serverless Pool is connection-scoped (not process-scoped like postgres.js),
//        so it doesn't leak across Lambda invocations.
//
// REQUIREMENT: DATABASE_URL must be a direct neon.tech connection string.
//   ✅ postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/db?sslmode=require
//   ❌ postgres://...@db.prisma.io:5432/... (Prisma Accelerate — HTTP 404)
//
// USAGE:
//   import { db } from "@/db";          ← for all normal queries (95% of code)
//   import { dbPool } from "@/db";      ← for db.transaction() call sites only
//
// ─────────────────────────────────────────────────────────────────────────────

// Client 1: HTTP — stateless, no connection management needed
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzleHttp(sql, { schema });

// Client 2: WebSocket Pool — scoped to this invocation, supports transactions
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const dbPool = drizzleWs(pool, { schema });
