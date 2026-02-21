import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createLogger } from "@/lib/logger";

const logger = createLogger("DBPool");

// Enable SSL for cloud databases (Prisma Postgres, Vercel Postgres, etc.)
const requiresSSL = process.env.NODE_ENV === 'production' ||
    process.env.DATABASE_URL?.includes('prisma.io') ||
    process.env.DATABASE_URL?.includes('sslmode=require');

// Serverless detection: each Vercel function invocation is isolated,
// so max:1 is correct (no pool-sharing between invocations).
// In test/dev, process is shared across many concurrent queries — use 5.
const isServerless = process.env.VERCEL === '1';
const maxConnections = isServerless ? 1 : 5;

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
