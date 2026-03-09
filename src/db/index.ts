import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// ── DB CLIENT ─────────────────────────────────────────────────────────────────
//
// DATABASE_URL points to Prisma Accelerate (db.prisma.io) which speaks standard
// Postgres wire protocol over TCP. We use postgres.js which supports this.
//
// NOTE (2026-03-08): We attempted to migrate to @neondatabase/serverless to fix
// idle TCP connection drops (581 errors in 7 days). That migration was reverted
// because the Neon HTTP driver requires a direct neon.tech connection string, but
// our Vercel environment only has the Prisma Accelerate proxy URL. Neon HTTP
// cannot speak to a Prisma Accelerate endpoint — it calls Neon's REST API
// directly, causing HTTP 404 "Resource Not Found" in production.
//
// The original idle-connection problem (TLSWrap.onStreamRead) is mitigated here
// by using max:1 and idle_timeout:20 so postgres.js recycles the connection
// before Neon's ~30s server-side idle timeout can kill it.
//
// FUTURE(v2): To properly use @neondatabase/serverless, the Vercel integration
// must be changed from Prisma Accelerate to a direct Neon connection string.
// ─────────────────────────────────────────────────────────────────────────────

const client = postgres(process.env.DATABASE_URL!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
});

export const db = drizzle(client, { schema });

// `dbPool` alias — kept for compatibility with transaction call sites that
// import { dbPool } from "@/db". Both point to the same client.
export const dbPool = db;
