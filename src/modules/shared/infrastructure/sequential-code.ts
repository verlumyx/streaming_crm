import { desc, eq, sql } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { DbExecutor } from './db-executor';

export const CODE_WIDTH = 6;

export function formatSequentialCode(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(CODE_WIDTH, '0')}`;
}

export function parseSequentialCode(code: string | null | undefined, prefix: string): number {
  if (!code || !code.startsWith(prefix)) return 0;
  const n = Number.parseInt(code.slice(prefix.length), 10);
  return Number.isFinite(n) ? n : 0;
}

type CodedTable = PgTable & { companyId: PgColumn; code: PgColumn };

/**
 * Next `PREFIX000001` code for a company. MUST run on the `tx` opened by the action:
 * the `FOR UPDATE` lock queues concurrent creates, the re-read after the lock sees the
 * row the previous transaction inserted, and the unique `(company_id, code)` index is the safety net.
 */
export async function generateNextCode(
  db: DbExecutor,
  table: CodedTable,
  companyId: string,
  prefix: string,
): Promise<string> {
  const where = eq(table.companyId, companyId);

  // 1. Lock the current last row (or nothing, for a company's first record).
  await db.select({ code: table.code }).from(table).where(where).orderBy(desc(table.code)).limit(1).for('update');

  // 2. Fresh snapshot after the lock is acquired.
  const [last] = await db.select({ code: table.code }).from(table).where(where).orderBy(desc(table.code)).limit(1);

  const next = parseSequentialCode(last?.code as string | undefined, prefix) + 1;
  return formatSequentialCode(prefix, next);
}

/** Serializes concurrent "first record" inserts of a company (no row to lock yet). */
export async function lockCompanySequence(db: DbExecutor, companyId: string, prefix: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(hashtext(${`${prefix}:${companyId}`}))`);
}
