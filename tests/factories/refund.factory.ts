import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';
import { uuidv7 } from '@/modules/shared/uuid';
import { refunds, REFUND_CODE_PREFIX, type NewRefundRow, type RefundRow } from '@/modules/refund/models/refund.model';
import type { SaleRow } from '@/modules/sale/models/sale.model';
import { defined } from './utils';

let sequence = 0;

/** A refund of `sale` (client copied from the sale). Defaults: pending, 10.00, code `REF5000NN`. */
export async function createRefund(
  db: DbExecutor,
  sale: SaleRow,
  overrides: Partial<Omit<NewRefundRow, 'saleId' | 'clientId' | 'companyId'>> = {},
): Promise<RefundRow> {
  sequence++;
  const resolved = overrides.status && overrides.status !== 'pending';
  const [row] = await db
    .insert(refunds)
    .values({
      id: uuidv7(),
      companyId: sale.companyId,
      code: formatSequentialCode(REFUND_CODE_PREFIX, 500000 + sequence),
      saleId: sale.id,
      clientId: sale.clientId,
      amount: '10.00',
      reason: null,
      status: 'pending',
      resolvedAt: resolved ? new Date() : null,
      ...defined(overrides),
    })
    .returning();
  return row;
}
