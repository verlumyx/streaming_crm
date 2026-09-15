import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined.');
}

declare global {
  var __streamingCrmSql: ReturnType<typeof postgres> | undefined;
}

// Reuse the connection pool across HMR reloads in development.
const sql = globalThis.__streamingCrmSql ?? postgres(connectionString, { max: 10, prepare: false });
if (process.env.NODE_ENV !== 'production') globalThis.__streamingCrmSql = sql;

export const db = drizzle(sql, { schema, casing: 'snake_case' });

export type Db = typeof db;
