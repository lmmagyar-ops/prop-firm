import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createLogger } from "@/lib/logger";

const logger = createLogger("DBPool");

// Detect if we're in a serverless environment
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Enable SSL for cloud databases (Prisma Postgres, Vercel Postgres, etc.)
const requiresSSL = process.env.NODE_ENV === 'production' ||
    process.env.DATABASE_URL?.includes('prisma.io') ||
    process.env.DATABASE_URL?.includes('sslmode=require');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Serverless-optimized settings
    connectionTimeoutMillis: isServerless ? 10000 : 5000,  // 10s for serverless cold starts
    idleTimeoutMillis: isServerless ? 10000 : 30000,       // Close idle faster in serverless
    max: isServerless ? 5 : 10,                            // Fewer connections in serverless
    // SSL required for cloud Postgres (Vercel, Prisma, etc.)
    ssl: requiresSSL ? { rejectUnauthorized: false } : false,
    // Keep connections alive
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

// Handle pool errors gracefully (prevents crash on lost connection)
pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
    // Don't throw - let the pool recover
});

// Add connection test on startup (non-blocking)
pool.on('connect', () => {
    logger.info('New client connected');
});

import * as schema from "./schema";

export const db = drizzle(pool, { schema });
