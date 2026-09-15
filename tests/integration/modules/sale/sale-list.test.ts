import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { addDays } from '@/lib/format';
import { plans } from '@/modules/plan/models/plan.model';
import { sales } from '@/modules/sale/models/sale.model';
import { createSaleContainer } from '@/modules/sale/container';
import { SearchSaleCommand } from '@/modules/sale/commands/search-sale.command';
import { searchSaleSchema } from '@/modules/sale/validation/search-sale.schema';
import SalesPage from '@/app/[companyId]/sales/page';
import { resetDb } from '../../../helpers/reset-db';
import { expectRedirect, setSessionUser } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { makeSaleContext, persistSale } from '../../../helpers/sale-context';
import { createClient } from '../../../factories/client.factory';
import { createAccountWithProfiles, createPlan, createService } from '../../../factories/catalog.factory';
import { createSale } from '../../../factories/sale.factory';
import { createUser } from '../../../factories/user.factory';
import { daysFromToday, forbiddenUrl, saleEnding } from './sale-test-utils';

const TODAY = '2026-09-14';

function search(companyId: string, query: Record<string, string> = {}, today = TODAY) {
  const command = SearchSaleCommand.fromInput(searchSaleSchema.parse(query), companyId, today);
  return createSaleContainer(db).searchService.execute(command);
}

const page = (companyId: string, query: Record<string, string> = {}) =>
  SalesPage({ params: Promise.resolve({ companyId }), searchParams: Promise.resolve(query) });

describe('Listar ventas', () => {
  beforeEach(resetDb);

  it('the sales index renders with the company sales and the filter options', async () => {
    const ctx = await makeSaleContext(db);
    await persistSale(db, ctx, { status: 'active' });
    setSessionUser(ctx.user);

    const element = await page(ctx.company.id);

    expect(element.props.sales).toHaveLength(1);
    expect(element.props.sales[0]).toMatchObject({
      code: expect.stringMatching(/^SAL/),
      client: { id: ctx.client.id, name: ctx.client.name },
      service: { id: ctx.service.id, name: ctx.service.name },
      agent: { id: ctx.user.id, name: ctx.user.name },
      price: 10,
    });
    expect(element.props.meta).toEqual({ total: 1, limit: 20, offset: 0, hasMore: false });
    expect(element.props.clients.map((c: { id: string }) => c.id)).toEqual([ctx.client.id]);
    expect(element.props.services.map((s: { id: string }) => s.id)).toEqual([ctx.service.id]);
    expect(element.props.agents).toEqual([{ id: ctx.user.id, name: ctx.user.name }]);
  });

  it('each row exposes the current plan values next to the sale snapshot and the computed flags', async () => {
    const ctx = await makeSaleContext(db, 4);
    await saleEnding(ctx, daysFromToday(10), { profileIndex: 0 });
    await saleEnding(ctx, daysFromToday(-1), { status: 'expired', profileIndex: 1 });
    await saleEnding(ctx, daysFromToday(-10), { status: 'expired', profileIndex: 2 });
    await db.update(plans).set({ durationDays: 60, salePrice: '75.00' }).where(eq(plans.id, ctx.plan.id));
    setSessionUser(ctx.user);

    const element = await page(ctx.company.id);
    const rows = element.props.sales as Array<Record<string, unknown>>;
    const byEnd = (days: number) => rows.find((r) => r.endDate === daysFromToday(days));

    expect(byEnd(10)).toMatchObject({
      durationDays: 30,
      price: 10,
      plan: { durationDays: 60, salePrice: 75 },
      canBeRenewed: true,
      canBeReactivated: false,
      isInGracePeriod: false,
      daysUntilExpiration: 10,
    });
    expect(byEnd(-1)).toMatchObject({ isInGracePeriod: true, canBeRenewed: true, canBeReactivated: false });
    expect(byEnd(-10)).toMatchObject({ isInGracePeriod: false, canBeRenewed: false, canBeReactivated: true, daysUntilExpiration: -10 });
  });

  it('sales can be filtered by status, statusIn and code; unknown values are ignored', async () => {
    const ctx = await makeSaleContext(db, 6);
    const active = await persistSale(db, ctx, { status: 'active', profileIndex: 0 });
    await persistSale(db, ctx, { status: 'expired', profileIndex: 1 });
    await persistSale(db, ctx, { status: 'cancelled', profileIndex: 2 });

    expect((await search(ctx.company.id, { status: 'cancelled' })).data.map((s) => s.status)).toEqual(['cancelled']);
    expect((await search(ctx.company.id, { status: 'nope' })).total).toBe(3);
    expect((await search(ctx.company.id, { statusIn: 'active,expired,bogus' })).data.map((s) => s.status).sort()).toEqual([
      'active',
      'expired',
    ]);
    expect((await search(ctx.company.id, { code: active.code.slice(-3).toLowerCase() })).data.map((s) => s.id)).toEqual([
      active.id,
    ]);
  });

  it('sales can be filtered by client, agent and service; invalid ids are ignored', async () => {
    const ctx = await makeSaleContext(db, 4);
    const otherClient = await createClient(db, { companyId: ctx.company.id });
    const otherAgent = await createUser(db);
    const otherService = await createService(db, { companyId: ctx.company.id });
    const otherPlan = await createPlan(db, { companyId: ctx.company.id, serviceId: otherService.id });
    const otherAccount = await createAccountWithProfiles(db, { companyId: ctx.company.id, serviceId: otherService.id }, 1);

    await persistSale(db, ctx, { profileIndex: 0 });
    const ofClient = await persistSale(db, ctx, { profileIndex: 1, clientId: otherClient.id });
    const ofAgent = await createSale(db, {
      companyId: ctx.company.id,
      clientId: ctx.client.id,
      planId: ctx.plan.id,
      serviceId: ctx.service.id,
      agentId: otherAgent.id,
      profileIds: [ctx.profiles[2].id],
    });
    const ofService = await createSale(db, {
      companyId: ctx.company.id,
      clientId: ctx.client.id,
      planId: otherPlan.id,
      serviceId: otherService.id,
      agentId: ctx.user.id,
      profileIds: [otherAccount.profiles[0].id],
    });

    expect((await search(ctx.company.id, { clientId: otherClient.id })).data.map((s) => s.id)).toEqual([ofClient.id]);
    expect((await search(ctx.company.id, { agentId: otherAgent.id })).data.map((s) => s.id)).toEqual([ofAgent.id]);
    expect((await search(ctx.company.id, { serviceId: otherService.id })).data.map((s) => s.id)).toEqual([ofService.id]);
    expect((await search(ctx.company.id, { clientId: 'not-a-uuid' })).total).toBe(4);
  });

  it('sales can be filtered by start date and end date ranges (inclusive)', async () => {
    const ctx = await makeSaleContext(db, 4);
    const early = await persistSale(db, ctx, { startDate: '2026-08-01', profileIndex: 0 });
    const mid = await persistSale(db, ctx, { startDate: '2026-08-15', profileIndex: 1 });
    const late = await persistSale(db, ctx, { startDate: '2026-09-01', profileIndex: 2 });

    const ids = async (query: Record<string, string>) => (await search(ctx.company.id, query)).data.map((s) => s.id).sort();

    expect(await ids({ dateFrom: '2026-08-15' })).toEqual([mid.id, late.id].sort());
    expect(await ids({ dateTo: '2026-08-15' })).toEqual([early.id, mid.id].sort());
    expect(await ids({ dateFrom: '2026-08-02', dateTo: '2026-08-31' })).toEqual([mid.id]);
    expect(await ids({ endDateFrom: '2026-09-14', endDateTo: '2026-10-01' })).toEqual([mid.id, late.id].sort());
    expect(await ids({ dateFrom: '2026-13-45' })).toHaveLength(3);
  });

  it('expiringSoon keeps only active sales ending between today and today + N days', async () => {
    const ctx = await makeSaleContext(db, 6);
    const within = await saleEnding(ctx, addDays(TODAY, 3), { profileIndex: 0 });
    const boundary = await saleEnding(ctx, addDays(TODAY, 7), { profileIndex: 1 });
    const endsToday = await saleEnding(ctx, TODAY, { profileIndex: 2 });
    await saleEnding(ctx, addDays(TODAY, 8), { profileIndex: 3 });
    await saleEnding(ctx, addDays(TODAY, -1), { profileIndex: 4 });
    await saleEnding(ctx, addDays(TODAY, 2), { status: 'expired', profileIndex: 5 });

    const { data } = await search(ctx.company.id, { expiringSoon: '7' });

    expect(data.map((s) => s.id).sort()).toEqual([within.id, boundary.id, endsToday.id].sort());
    expect((await search(ctx.company.id, { expiringSoon: 'abc' })).total).toBe(6);
  });

  it('the expirations order sorts by end date ascending', async () => {
    const ctx = await makeSaleContext(db, 4);
    const later = await saleEnding(ctx, addDays(TODAY, 9), { profileIndex: 0 });
    const sooner = await saleEnding(ctx, addDays(TODAY, 1), { profileIndex: 1 });

    const { data } = await createSaleContainer(db).searchService.execute(
      new SearchSaleCommand({ companyId: ctx.company.id, today: TODAY, orderBy: 'endDate', filters: { statusIn: 'active' } }),
    );

    expect(data.map((s) => s.id)).toEqual([sooner.id, later.id]);
  });

  it('the index only shows sales of the active company and skips soft-deleted ones', async () => {
    const ctx = await makeSaleContext(db);
    const other = await makeSaleContext(db);
    const mine = await persistSale(db, ctx, { profileIndex: 0 });
    const deleted = await persistSale(db, ctx, { profileIndex: 1 });
    await persistSale(db, other);
    await db.update(sales).set({ deletedAt: new Date() }).where(eq(sales.id, deleted.id));

    const { data, total } = await search(ctx.company.id);

    expect(total).toBe(1);
    expect(data.map((s) => s.id)).toEqual([mine.id]);
  });

  it('a user without list permission cannot view the index', async () => {
    const ctx = await makeSaleContext(db);
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, ['accounts.list', 'sales.show']);
    setSessionUser(ctx.user);

    await expectRedirect(page(ctx.company.id), forbiddenUrl(ctx.company.id));
  });
});
