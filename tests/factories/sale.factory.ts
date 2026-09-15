import { inArray } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';
import { uuidv7 } from '@/modules/shared/uuid';
import { addDays } from '@/lib/format';
import {
  saleProfiles,
  saleRenewals,
  sales,
  SALE_CODE_PREFIX,
  type NewSaleRow,
  type SaleRenewalRow,
  type SaleRow,
} from '@/modules/sale/models/sale.model';
import { profiles } from '@/modules/account/models/account.model';
import { defined } from './utils';

let sequence = 0;

type SaleOverrides = Partial<NewSaleRow> & {
  companyId: string;
  clientId: string;
  planId: string;
  serviceId: string;
  agentId: string;
  profileIds?: string[];
};

/** Persists a sale, its `app_sale_profiles` rows, and marks the profiles occupied (unless cancelled). */
export async function createSale(db: DbExecutor, { profileIds = [], ...input }: SaleOverrides): Promise<SaleRow> {
  sequence++;
  const overrides = defined(input) as Omit<SaleOverrides, 'profileIds'>;
  const startDate = overrides.startDate ?? '2026-09-01';
  const durationDays = overrides.durationDays ?? 30;

  const [sale] = await db
    .insert(sales)
    .values({
      id: uuidv7(),
      code: formatSequentialCode(SALE_CODE_PREFIX, 700000 + sequence),
      capacity: 'profile',
      durationDays,
      price: '10.00',
      startDate,
      endDate: addDays(startDate, durationDays),
      status: 'active',
      ...overrides,
    })
    .returning();

  if (profileIds.length > 0) {
    await db.insert(saleProfiles).values(profileIds.map((profileId) => ({ id: uuidv7(), saleId: sale.id, profileId })));
    if (sale.status !== 'cancelled') {
      await db.update(profiles).set({ status: 'occupied' }).where(inArray(profiles.id, profileIds));
    }
  }

  return sale;
}

export async function createSaleRenewal(
  db: DbExecutor,
  sale: SaleRow,
  overrides: { price?: string; durationDays?: number; renewedBy?: string | null } = {},
): Promise<SaleRenewalRow> {
  const durationDays = overrides.durationDays ?? sale.durationDays;
  const [row] = await db
    .insert(saleRenewals)
    .values({
      id: uuidv7(),
      saleId: sale.id,
      renewedAt: sale.endDate,
      previousEndDate: sale.endDate,
      newEndDate: addDays(sale.endDate, durationDays),
      durationDays,
      price: overrides.price ?? sale.price,
      renewedBy: overrides.renewedBy ?? null,
    })
    .returning();
  return row;
}
