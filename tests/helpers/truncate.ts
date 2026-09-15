import { sql } from 'drizzle-orm';
import { getTableName, type Table } from 'drizzle-orm';
import { db } from '@/db/client';

/** TRUNCATE the given tables (CASCADE) — used in `beforeEach` of integration tests. */
export async function truncate(...tables: Table[]): Promise<void> {
  if (tables.length === 0) return;
  const names = tables.map((t) => `"${getTableName(t)}"`).join(', ');
  await db.execute(sql.raw(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`));
}
