/**
 * Database types for Drizzle ORM
 * 
 * These types provide proper typing for database operations,
 * eliminating `any` types in the codebase.
 */

import { db } from './index';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from './schema';

// Type for the database instance
export type Database = PostgresJsDatabase<typeof schema>;

// Type for database transactions
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

// Re-export schema types for convenience
export type { schema };
