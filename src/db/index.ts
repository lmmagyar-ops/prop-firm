import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Performance optimization for cold starts
    connectionTimeoutMillis: 5000,  // 5s max to establish connection
    idleTimeoutMillis: 30000,       // Close idle connections after 30s
    max: 10,                        // Max pool size
});

import * as schema from "./schema";

export const db = drizzle(pool, { schema });
