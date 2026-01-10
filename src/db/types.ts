/**
 * Database types for Drizzle ORM
 * 
 * These types provide proper typing for database operations,
 * eliminating `any` types in the codebase.
 */

import { db } from './index';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema';

// Type for the database instance
export type Database = typeof db;

// Type for database transactions
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

// Re-export schema types for convenience
export type { schema };
