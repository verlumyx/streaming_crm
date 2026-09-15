import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { uuidv7 } from '@/modules/shared/uuid';
import {
  transactions,
  typeForCategory,
  type TransactionCategory,
  type TransactionRow,
} from '@/modules/transaction/models/transaction.model';

let sequence = 0;

/** A ledger entry (type derived from the category). Defaults: `sale`, 10.00, 2026-09-14. */
export async function createTransaction(
  db: DbExecutor,
  opts: { companyId: string; category?: TransactionCategory; amount?: number; date?: string; description?: string },
): Promise<TransactionRow> {
  sequence++;
  const category = opts.category ?? 'sale';
  const [row] = await db
    .insert(transactions)
    .values({
      id: uuidv7(),
      companyId: opts.companyId,
      type: typeForCategory(category),
      category,
      amount: (opts.amount ?? 10).toFixed(2),
      date: opts.date ?? '2026-09-14',
      paymentMethod: 'cash',
      description: opts.description ?? `Movimiento ${sequence}`,
    })
    .returning();
  return row;
}
