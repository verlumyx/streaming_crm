import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase, PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import type * as schema from '@/db/schema';

type Schema = typeof schema;

export type DbTransaction = PgTransaction<PostgresJsQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;

/**
 * Either the root Drizzle client or a transaction opened by a Server Action.
 * Repositories receive one and never import the global `db` themselves.
 */
export type DbExecutor = PostgresJsDatabase<Schema> | DbTransaction;
