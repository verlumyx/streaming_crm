import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { addDays, todayIsoDate } from '@/lib/format';
import { uuidv7 } from '@/modules/shared/uuid';
import { saleRenewals, type SaleStatus } from '@/modules/sale/models/sale.model';
import ExpirationsReportPage from '@/app/[companyId]/reports/expirations/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { makeSaleContext, type SaleContext } from '../../../helpers/sale-context';
import { createSale } from '../../../factories/sale.factory';

const render = (companyId: string, query: Record<string, string> = {}) =>
  ExpirationsReportPage({ params: Promise.resolve({ companyId }), searchParams: Promise.resolve(query) });

const sale = (ctx: SaleContext, status: SaleStatus, endDate: string) =>
  createSale(db, {
    companyId: ctx.company.id,
    clientId: ctx.client.id,
    planId: ctx.plan.id,
    serviceId: ctx.service.id,
    agentId: ctx.user.id,
    status,
    endDate,
    price: '100.00',
  });

describe('Reporte de vencimientos', () => {
  beforeEach(resetDb);

  it('a user without permission cannot view it', async () => {
    const ctx = await makeSaleContext(db);
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, []);
    setSessionUser(ctx.user);

    await expectRedirect(render(ctx.company.id), `/${ctx.company.id}/dashboard?error=forbidden`);
  });

  it('renders empty until a search is performed', async () => {
    const ctx = await makeSaleContext(db);
    await sale(ctx, 'active', addDays(todayIsoDate(), 3));
    setSessionUser(ctx.user);

    const { props } = await render(ctx.company.id);

    expect(props).toMatchObject({
      searched: false,
      sales: [],
      meta: { total: 0 },
      summary: { expiringCount: 0, expiredCount: 0, renewalRate: 0 },
      filters: { days: 7, status: 'expiring' },
    });
    expect(props.services.length).toBeGreaterThan(0);
    expect(props.agents.map((a: { id: string }) => a.id)).toContain(ctx.user.id);
  });

  it('filters active sales by the upcoming-days range', async () => {
    const ctx = await makeSaleContext(db);
    const today = todayIsoDate();
    const soon = await sale(ctx, 'active', addDays(today, 3));
    await sale(ctx, 'active', addDays(today, 20));
    await sale(ctx, 'expired', addDays(today, -5));
    setSessionUser(ctx.user);

    const { props } = await render(ctx.company.id, { days: '7', status: 'expiring', searched: '1' });

    expect(props.sales.map((s: { code: string }) => s.code)).toEqual([soon.code]);
    expect(props.sales[0]).toMatchObject({ daysUntilExpiration: 3, canBeRenewed: true });
    expect(props.summary).toMatchObject({ expiringCount: 1, expiringAmount: 100 });
  });

  it('lists expired sales without renewal when status is expired, most urgent first', async () => {
    const ctx = await makeSaleContext(db);
    const today = todayIsoDate();
    const older = await sale(ctx, 'expired', addDays(today, -10));
    const recent = await sale(ctx, 'expired', addDays(today, -2));
    await sale(ctx, 'active', addDays(today, 4));
    setSessionUser(ctx.user);

    const { props } = await render(ctx.company.id, { status: 'expired', searched: '1' });

    expect(props.sales.map((s: { id: string }) => s.id)).toEqual([older.id, recent.id]);
    expect(props.sales.every((s: { status: string }) => s.status === 'expired')).toBe(true);
    expect(props.sales[1].isInGracePeriod).toBe(true);
    expect(props.meta.total).toBe(2);
    expect(props.summary).toMatchObject({ expiredCount: 2, expiredAmount: 200 });
  });

  it('the renewal rate crosses sales with their renewals', async () => {
    const ctx = await makeSaleContext(db);
    await sale(ctx, 'expired', '2026-03-15');
    await sale(ctx, 'expired', '2026-03-22');
    const renewed = await sale(ctx, 'active', '2026-04-20');
    await db.insert(saleRenewals).values({
      id: uuidv7(),
      saleId: renewed.id,
      renewedAt: '2026-03-10',
      previousEndDate: '2026-03-10',
      newEndDate: '2026-04-20',
      durationDays: 30,
      price: '100.00',
    });
    setSessionUser(ctx.user);

    const { props } = await render(ctx.company.id, {
      status: 'expired',
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      searched: '1',
    });

    // 1 renewed out of 3 expirations in the window → 33.33 %.
    expect(props.summary).toMatchObject({ expiredCount: 2, renewalRate: 33.33 });
  });

  it('only shows sales from the active company', async () => {
    const ctx = await makeSaleContext(db);
    const other = await makeSaleContext(db);
    const today = todayIsoDate();
    await sale(ctx, 'active', addDays(today, 3));
    await sale(other, 'active', addDays(today, 3));
    setSessionUser(ctx.user);

    const { props } = await render(ctx.company.id, { days: '7', status: 'expiring', searched: '1' });

    expect(props.sales).toHaveLength(1);
    expect(props.meta.total).toBe(1);
  });

  it('ignores invalid days and status values', async () => {
    const ctx = await makeSaleContext(db);
    setSessionUser(ctx.user);

    const { props } = await render(ctx.company.id, { days: '9', status: 'nope' });

    expect(props.filters).toMatchObject({ days: 7, status: 'expiring' });
  });
});
