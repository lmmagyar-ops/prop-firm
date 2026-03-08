/**
 * Database types for Drizzle ORM
 *
 * These types provide proper typing for database operations,
 * eliminating `any` types in the codebase.
 *
 * NOTE: `Transaction` is derived from `dbPool` (neon-serverless), not `db` (neon-http),
 * because db.transaction() is only available on the Pool-backed client. All helper
 * functions that accept a `tx` parameter (BalanceManager, PositionManager, etc.)
 * use this type.
 */

import { dbPool } from './index';
import type * as schema from './schema';

// Type for the database instance (neon-http, used for all read queries)
export type Database = typeof dbPool;

// Type for database transactions — derived from dbPool (neon-serverless WebSocket).
// All helpers (BalanceManager, PositionManager, etc.) accept this type.
export type Transaction = Parameters<Parameters<(typeof dbPool)['transaction']>[0]>[0];

// Re-export schema types for convenience
export type { schema };
