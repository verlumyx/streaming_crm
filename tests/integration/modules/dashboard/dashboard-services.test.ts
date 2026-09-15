import { beforeEach, describe, expect, it } from 'vitest';
import { inArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { uuidv7 } from '@/modules/shared/uuid';
import { addDays } from '@/lib/format';
import { profiles, type ProfileStatus } from '@/modules/account/models/account.model';
import { createDashboardContainer } from '@/modules/dashboard/container';
import { createTransactionContainer } from '@/modules/transaction/container';
import { CreateTransactionCommand } from '@/modules/transaction/commands/create-transaction.command';
import type { TransactionCategory } from '@/modules/transaction/models/transaction.model';
import { resetDb } from '../../../helpers/reset-db';
import { createUserWithCompany } from '../../../helpers/company-context';
import { makeSaleContext } from '../../../helpers/sale-context';
import { createCompany } from '../../../factories/company.factory';
import { createAccountWithProfiles, createService } from '../../../factories/catalog.factory';
import { createClient } from '../../../factories/client.factory';
import { createSale } from '../../../factories/sale.factory';

const TODAY = '2026-09-14';

async function ledger(companyId: string, category: TransactionCategory, amount: number, date = TODAY) {
  await createTransactionContainer(db).recordService.execute(
    new CreateTransactionCommand(uuidv7(), companyId, category, amount, date, 'test'),
  );
}

/** One account of `serviceId` whose profiles have the given statuses. */
async function seedProfiles(companyId: string, serviceId: string, counts: Partial<Record<ProfileStatus, number>>) {
  const statuses = (['occupied', 'available', 'maintenance'] as const).flatMap((s) => Array(counts[s] ?? 0).fill(s));
  const { profiles: rows } = await createAccountWithProfiles(db, { companyId, serviceId }, statuses.length);
  for (const status of ['occupied', 'maintenance'] as const) {
    const ids = rows.filter((_, i) => statuses[i] === status).map((p) => p.id);
    if (ids.length) await db.update(profiles).set({ status }).where(inArray(profiles.id, ids));
  }
}

describe('Dashboard services', () => {
  beforeEach(resetDb);

  it('occupancy service counts profiles by status scoped to the company', async () => {
    const { company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    await seedProfiles(company.id, service.id, { occupied: 3, available: 2, maintenance: 1 });

    const other = await createCompany(db);
    await seedProfiles(other.id, (await createService(db, { companyId: other.id })).id, { occupied: 5 });

    expect(await createDashboardContainer(db).occupancyService.execute(company.id)).toEqual({
      occupied: 3,
      available: 2,
      maintenance: 1,
      total: 6,
    });
  });

  it('metrics service aggregates income, expense, profiles and receivables', async () => {
    const ctx = await makeSaleContext(db, 5);
    const { company } = ctx;
    await ledger(company.id, 'sale', 100);
    await ledger(company.id, 'renewal', 50);
    await ledger(company.id, 'streaming_account', 60);
    await db.update(profiles).set({ status: 'occupied' }).where(inArray(profiles.id, [ctx.profiles[0].id, ctx.profiles[1].id]));

    const base = { companyId: company.id, planId: ctx.plan.id, serviceId: ctx.service.id, agentId: ctx.user.id };
    await createSale(db, { ...base, clientId: ctx.client.id, status: 'expired', price: '30.00' });
    await createSale(db, { ...base, clientId: ctx.client.id, status: 'expired', price: '20.00' });
    const other = await createClient(db, { companyId: company.id });
    await createSale(db, { ...base, clientId: other.id, status: 'active', price: '999.00' });

    const result = await createDashboardContainer(db).metricsService.execute(company.id, TODAY);

    expect(result).toMatchObject({
      incomeMonth: 150,
      expenseMonth: 60,
      netProfit: 90,
      profitMarginPct: 60,
      activeProfiles: 2,
      freeProfiles: 3,
      totalProfiles: 5,
      receivableAmount: 50,
      receivableClients: 1,
    });
  });

  it('metrics trend is null when there is no comparable previous month and computed otherwise', async () => {
    const { company } = await createUserWithCompany(db);
    await ledger(company.id, 'sale', 100);

    const { metricsService } = createDashboardContainer(db);
    expect((await metricsService.execute(company.id, TODAY)).incomeTrendPct).toBeNull();

    await ledger(company.id, 'sale', 80, '2026-08-31');
    const withPrevious = await metricsService.execute(company.id, TODAY);
    expect(withPrevious.incomeTrendPct).toBe(25);
    expect(withPrevious.profitTrendPct).toBe(25);
  });

  it('revenue service returns six month buckets ending in the current month', async () => {
    const { company } = await createUserWithCompany(db);
    await ledger(company.id, 'sale', 200);
    await ledger(company.id, 'marketing', 80);
    await ledger(company.id, 'sale', 70, '2026-08-10');
    await ledger(company.id, 'sale', 5000, '2026-01-10'); // outside the 6-month window

    const result = await createDashboardContainer(db).revenueService.execute(company.id, TODAY);

    expect(result.map((r) => r.month)).toEqual(['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep']);
    expect(result[5]).toEqual({ month: 'Sep', income: 200, expense: 80, profit: 120 });
    expect(result[4].income).toBe(70);
    expect(result.reduce((sum, r) => sum + r.income, 0)).toBe(270);
  });

  it('platforms service ranks occupied profiles per service descending', async () => {
    const { company } = await createUserWithCompany(db);
    const netflix = await createService(db, { companyId: company.id, name: 'Netflix' });
    const spotify = await createService(db, { companyId: company.id, name: 'Spotify' });
    await seedProfiles(company.id, netflix.id, { occupied: 2, available: 4 });
    await seedProfiles(company.id, spotify.id, { occupied: 5 });

    const result = await createDashboardContainer(db).platformsService.execute(company.id);

    expect(result).toEqual([
      { id: spotify.id, name: 'Spotify', occupied: 5 },
      { id: netflix.id, name: 'Netflix', occupied: 2 },
    ]);
  });

  it('expirations service lists soon-to-expire and overdue sales only', async () => {
    const ctx = await makeSaleContext(db);
    const base = {
      companyId: ctx.company.id,
      clientId: ctx.client.id,
      planId: ctx.plan.id,
      serviceId: ctx.service.id,
      agentId: ctx.user.id,
      durationDays: 30,
    };
    const soon = await createSale(db, { ...base, status: 'active', startDate: addDays(addDays(TODAY, 3), -30) });
    const overdue = await createSale(db, { ...base, status: 'expired', startDate: addDays(addDays(TODAY, -2), -30) });
    await createSale(db, { ...base, status: 'active', startDate: TODAY }); // ends in 30 days
    await createSale(db, { ...base, status: 'cancelled', startDate: addDays(TODAY, -30) }); // cancelled never listed

    const result = await createDashboardContainer(db).expirationsService.execute(ctx.company.id, TODAY);

    expect(result.map((r) => [r.id, r.statusKey, r.days])).toEqual([
      [overdue.id, 'vencido', -2],
      [soon.id, 'porvencer', 3],
    ]);
    expect(result[0]).toMatchObject({ clientName: ctx.client.name, serviceName: ctx.service.name });
  });
});
