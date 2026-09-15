import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import type { SaleRow, SaleStatus } from '@/modules/sale/models/sale.model';
import { createUserWithCompany, type UserWithCompany } from './company-context';
import { createClient } from '../factories/client.factory';
import { createAccountWithProfiles, createPlan, createService } from '../factories/catalog.factory';
import { createSale } from '../factories/sale.factory';
import type { ClientRow } from '@/modules/client/models/client.model';
import type { ServiceRow } from '@/modules/service/models/service.model';
import type { PlanRow } from '@/modules/plan/models/plan.model';
import type { AccountRow, ProfileRow } from '@/modules/account/models/account.model';

export type SaleContext = UserWithCompany & {
  client: ClientRow;
  service: ServiceRow;
  plan: PlanRow;
  account: AccountRow;
  profiles: ProfileRow[];
};

/** Equivalent of the original `makeSaleContext()`: admin user + company + client + service + plan + account with profiles. */
export async function makeSaleContext(db: DbExecutor, maxProfiles = 4): Promise<SaleContext> {
  const base = await createUserWithCompany(db);
  const client = await createClient(db, { companyId: base.company.id });
  const service = await createService(db, { companyId: base.company.id, maxProfiles });
  const plan = await createPlan(db, { companyId: base.company.id, serviceId: service.id });
  const { account, profiles } = await createAccountWithProfiles(
    db,
    { companyId: base.company.id, serviceId: service.id },
    maxProfiles,
  );
  return { ...base, client, service, plan, account, profiles };
}

/** Equivalent of `persistSale()`: a one-profile sale for the context client. */
export async function persistSale(
  db: DbExecutor,
  ctx: SaleContext,
  opts: { status?: SaleStatus; startDate?: string; price?: string; profileIndex?: number; clientId?: string } = {},
): Promise<SaleRow> {
  return createSale(db, {
    companyId: ctx.company.id,
    clientId: opts.clientId ?? ctx.client.id,
    planId: ctx.plan.id,
    serviceId: ctx.service.id,
    agentId: ctx.user.id,
    status: opts.status ?? 'active',
    startDate: opts.startDate,
    price: opts.price,
    profileIds: [ctx.profiles[opts.profileIndex ?? 0].id],
  });
}
