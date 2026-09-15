import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { uuidv7 } from '@/modules/shared/uuid';
import {
  accountRenewals,
  type AccountRenewalRow,
  type AccountRow,
  type NewAccountRenewalRow,
} from '@/modules/account/models/account.model';
import { defined } from './utils';

/** A renewal movement of `account` (defaults to the account's first period). */
export async function createAccountRenewal(
  db: DbExecutor,
  account: AccountRow,
  overrides: Partial<NewAccountRenewalRow> = {},
): Promise<AccountRenewalRow> {
  const [row] = await db
    .insert(accountRenewals)
    .values({
      id: uuidv7(),
      companyId: account.companyId,
      accountId: account.id,
      type: 'renewal',
      amount: '10.00',
      periodStart: account.purchaseDate,
      periodEnd: account.nextRenewal,
      paidAt: account.purchaseDate,
      notes: null,
      createdBy: null,
      ...defined(overrides),
    } as never)
    .returning();
  return row;
}
