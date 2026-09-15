import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';
import { uuidv7 } from '@/modules/shared/uuid';
import {
  manualTransactionLines,
  manualTransactions,
  MANUAL_TRANSACTION_CODE_PREFIX,
  type ManualTransactionRow,
  type ManualTransactionStatus,
} from '@/modules/manual-transaction/models/manual-transaction.model';
import { typeForCategory, type TransactionCategory } from '@/modules/transaction/models/transaction.model';

let sequence = 0;

type LineSeed = { category: TransactionCategory; amount: number; description?: string | null };

/** A manual transaction (default pending, dated 2026-09-14) with the given lines; total = Σ lines. */
export async function createManualTransaction(
  db: DbExecutor,
  opts: { companyId: string; lines?: LineSeed[]; status?: ManualTransactionStatus; date?: string; description?: string | null },
): Promise<ManualTransactionRow> {
  sequence++;
  const lines = opts.lines ?? [
    { category: 'partner_contribution', amount: 100 },
    { category: 'salary', amount: 40 },
  ];
  const id = uuidv7();

  const [row] = await db
    .insert(manualTransactions)
    .values({
      id,
      companyId: opts.companyId,
      code: formatSequentialCode(MANUAL_TRANSACTION_CODE_PREFIX, 600000 + sequence),
      date: opts.date ?? '2026-09-14',
      paymentMethod: 'cash',
      currency: 'USD',
      description: opts.description ?? null,
      total: lines.reduce((s, l) => s + l.amount, 0).toFixed(2),
      status: opts.status ?? 'pending',
    })
    .returning();

  if (lines.length) {
    await db.insert(manualTransactionLines).values(
      lines.map((l) => ({
        id: uuidv7(),
        manualTransactionId: id,
        type: typeForCategory(l.category),
        category: l.category,
        amount: l.amount.toFixed(2),
        description: l.description ?? null,
      })),
    );
  }

  return row;
}
