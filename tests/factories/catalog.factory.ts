import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { formatSequentialCode } from '@/modules/shared/infrastructure/sequential-code';
import { uuidv7 } from '@/modules/shared/uuid';
import { defined } from './utils';
import { services, SERVICE_CODE_PREFIX, type NewServiceRow, type ServiceRow } from '@/modules/service/models/service.model';
import { plans, PLAN_CODE_PREFIX, type NewPlanRow, type PlanRow } from '@/modules/plan/models/plan.model';
import {
  accounts,
  profiles,
  ACCOUNT_CODE_PREFIX,
  type AccountRow,
  type NewAccountRow,
  type ProfileRow,
} from '@/modules/account/models/account.model';

let sequence = 0;
const next = () => ++sequence + 800000;

export async function createService(
  db: DbExecutor,
  overrides: Partial<NewServiceRow> & { companyId: string },
): Promise<ServiceRow> {
  const n = next();
  const [row] = await db
    .insert(services)
    .values({
      id: uuidv7(),
      code: formatSequentialCode(SERVICE_CODE_PREFIX, n),
      name: `Servicio ${n}`,
      logoUrl: null,
      maxProfiles: 5,
      active: true,
      ...defined(overrides),
    } as never)
    .returning();
  return row;
}

export async function createPlan(
  db: DbExecutor,
  overrides: Partial<NewPlanRow> & { companyId: string; serviceId: string },
): Promise<PlanRow> {
  const n = next();
  const [row] = await db
    .insert(plans)
    .values({
      id: uuidv7(),
      code: formatSequentialCode(PLAN_CODE_PREFIX, n),
      name: `Plan ${n}`,
      capacity: 'profile',
      durationDays: 30,
      salePrice: '10.00',
      roiTargetPct: '20.00',
      active: true,
      ...defined(overrides),
    } as never)
    .returning();
  return row;
}

/** An account of the service with `count` available profiles numbered 1..count. */
export async function createAccountWithProfiles(
  db: DbExecutor,
  overrides: Partial<NewAccountRow> & { companyId: string; serviceId: string },
  count = 5,
): Promise<{ account: AccountRow; profiles: ProfileRow[] }> {
  const n = next();
  const [account] = await db
    .insert(accounts)
    .values({
      id: uuidv7(),
      code: formatSequentialCode(ACCOUNT_CODE_PREFIX, n),
      email: `account${n}@streaming.test`,
      passwordEncrypted: 'v1:test:test:test',
      cost: '20.00',
      purchaseDate: '2026-09-01',
      nextRenewal: '2026-10-01',
      status: 'active',
      ...defined(overrides),
    } as never)
    .returning();

  const rows = await db
    .insert(profiles)
    .values(
      Array.from({ length: count }, (_, i) => ({
        id: uuidv7(),
        accountId: account.id,
        number: i + 1,
        status: 'available' as const,
      })),
    )
    .returning();

  return { account, profiles: rows.sort((a, b) => a.number - b.number) };
}
