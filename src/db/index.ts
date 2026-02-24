import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createLogger } from "@/lib/logger";

const logger = createLogger("DBPool");

// Enable SSL for cloud databases (Prisma Postgres, Vercel Postgres, etc.)
const requiresSSL = process.env.NODE_ENV === 'production' ||
    process.env.DATABASE_URL?.includes('prisma.io') ||
    process.env.DATABASE_URL?.includes('sslmode=require');

// Serverless connection count: must be > 1.
//
// WHY NOT 1: db.transaction() holds connection_0 for the entire callback duration.
// RiskEngine.validateTrade is called INSIDE the callback via `db.*` (not `tx`),
// so it needs a SECOND connection from the pool. With max:1, it deadlocks waiting
// for connection_0 to be freed — which won't happen until RiskEngine returns.
// The function hangs for 60 s (maxDuration) and the client aborts at 30 s.
//
// WHY 3: the in-transaction risk check makes 2 sequential db.* queries (challenges
// + positions). They can share connection_1 (sequential, not parallel), so max:2
// would suffice. max:3 provides one spare for any other concurrent in-flight queries
// from Next.js middleware / route handlers on the same warm Lambda invocation.
const isServerless = process.env.VERCEL === '1';
const maxConnections = isServerless ? 3 : 5;


// postgres.js: replaces pg.Pool to fix N+1 pg-pool.connect on Vercel serverless.
//
// WHY NOT pg.Pool:
//   pg.Pool is designed for long-running servers. On Vercel serverless, each
//   function invocation may spin up its own pool (pool-of-pools anti-pattern),
//   and max:5 is exhausted by a single /dashboard SSR that runs 5+ sequential
//   queries — causing N+1 pg-pool.connect events and Failed query errors in
//   Next.js unstable_cache revalidation.
//
// See: Sentry N+1 issue JAVASCRIPT-NEXTJS-1/2 (Feb 2026)
const client = postgres(process.env.DATABASE_URL!, {
    ssl: requiresSSL ? 'require' : false,
    max: maxConnections,
    idle_timeout: 20,   // release quickly so quota isn't held
    connect_timeout: 10,
    onnotice: (notice) => logger.info('DB notice', notice),
});


import * as schema from "./schema";

export const db = drizzle(client, { schema });
