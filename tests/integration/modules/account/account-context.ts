import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { encrypt } from '@/modules/shared/crypto';
import { uuidv7 } from '@/modules/shared/uuid';
import type { NewAccountRow } from '@/modules/account/models/account.model';
import type { ServiceRow } from '@/modules/service/models/service.model';
import { createUserWithCompany, type UserWithCompany } from '../../../helpers/company-context';
import { createAccountWithProfiles, createService } from '../../../factories/catalog.factory';

export type AccountContext = UserWithCompany & { service: ServiceRow };

/** Admin user + company + one active service with `maxProfiles` slots. */
export async function makeAccountContext(db: DbExecutor, maxProfiles = 4): Promise<AccountContext> {
  const base = await createUserWithCompany(db);
  const service = await createService(db, { companyId: base.company.id, maxProfiles });
  return { ...base, service };
}

/** Account of the context service with `count` available profiles and a real encrypted password. */
export async function persistAccount(
  db: DbExecutor,
  ctx: AccountContext,
  overrides: Partial<NewAccountRow> & { password?: string } = {},
  count = ctx.service.maxProfiles,
) {
  const { password = 'original-pass', ...rest } = overrides;
  return createAccountWithProfiles(
    db,
    { companyId: ctx.company.id, serviceId: ctx.service.id, passwordEncrypted: encrypt(password), ...rest },
    count,
  );
}

type FormValues = Record<string, string | number | undefined>;
/** Scalar form fields plus `profiles` as plain objects (serialized to the JSON hidden field). */
type FormOverrides = { profiles?: unknown; [field: string]: unknown };

/** Create form payload as the browser submits it (profiles as one JSON field). */
export function createPayload(serviceId: string, overrides: FormOverrides = {}): FormValues {
  const { profiles, ...rest } = overrides;
  return {
    id: uuidv7(),
    serviceId,
    email: 'netflix.account@test.com',
    password: 'super-secret',
    cost: '12.50',
    purchaseDate: '2026-09-01',
    nextRenewal: '2026-10-01',
    ...(profiles !== undefined ? { profiles: JSON.stringify(profiles) } : {}),
    ...(rest as FormValues),
  };
}

/** Update form payload. */
export function updatePayload(overrides: FormOverrides = {}): FormValues {
  const { profiles, ...rest } = overrides;
  return {
    email: 'updated@test.com',
    cost: '20.00',
    purchaseDate: '2026-09-01',
    nextRenewal: '2026-11-01',
    status: 'active',
    ...(profiles !== undefined ? { profiles: JSON.stringify(profiles) } : {}),
    ...(rest as FormValues),
  };
}
