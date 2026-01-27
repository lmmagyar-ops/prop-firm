import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Detect if we're in a serverless environment
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Serverless-optimized settings
    connectionTimeoutMillis: isServerless ? 10000 : 5000,  // 10s for serverless cold starts
    idleTimeoutMillis: isServerless ? 10000 : 30000,       // Close idle faster in serverless
    max: isServerless ? 5 : 10,                            // Fewer connections in serverless
    // SSL required for Vercel Postgres
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Keep connections alive
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

// Handle pool errors gracefully (prevents crash on lost connection)
pool.on('error', (err) => {
    console.error('[DB Pool] Unexpected error on idle client:', err.message);
    // Don't throw - let the pool recover
});

// Add connection test on startup (non-blocking)
pool.on('connect', () => {
    console.log('[DB Pool] New client connected');
});

import * as schema from "./schema";

export const db = drizzle(pool, { schema });
