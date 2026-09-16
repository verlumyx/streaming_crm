import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { todayIsoDate } from '@/lib/format';
import { shiftMonth } from '@/modules/dashboard/domain/months';
import ServicePlanReportPage from '@/app/[companyId]/reports/service-plan/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { assignRoleWithPermissions } from '../../../helpers/company-context';
import { makeSaleContext, type SaleContext } from '../../../helpers/sale-context';
import { createPlan, createService } from '../../../factories/catalog.factory';
import { createSale } from '../../../factories/sale.factory';

const render = (companyId: string, query: Record<string, string> = {}) =>
  ServicePlanReportPage({ params: Promise.resolve({ companyId }), searchParams: Promise.resolve(query) });

const sale = (ctx: SaleContext, overrides: Partial<Parameters<typeof createSale>[1]> = {}) =>
  createSale(db, {
    companyId: ctx.company.id,
    clientId: ctx.client.id,
    planId: ctx.plan.id,
    serviceId: ctx.service.id,
    agentId: ctx.user.id,
    ...overrides,
  });

describe('Reporte por servicio / plan', () => {
  beforeEach(resetDb);

  it('a user without permission cannot view it', async () => {
    const ctx = await makeSaleContext(db);
    await assignRoleWithPermissions(db, ctx.user.id, ctx.company.id, []);
    setSessionUser(ctx.user);

    await expectRedirect(render(ctx.company.id), `/${ctx.company.id}/dashboard?error=forbidden`);
  });

  it('renders empty with the current-month range until a search is performed', async () => {
    const ctx = await makeSaleContext(db);
    await sale(ctx);
    setSessionUser(ctx.user);

    const { props } = await render(ctx.company.id);

    const today = todayIsoDate();
    expect(props).toMatchObject({
      searched: false,
      rows: [],
      meta: { total: 0 },
      filters: { groupBy: 'service', dateFrom: shiftMonth(today, 0).from, dateTo: today },
      summary: { totalSales: 0, totalRevenue: 0 },
    });
  });

  it('groups sales by service', async () => {
    const ctx = await makeSaleContext(db);
    const serviceA = await createService(db, { companyId: ctx.company.id, name: 'Servicio A' });
    const serviceB = await createService(db, { companyId: ctx.company.id, name: 'Servicio B' });
    await sale(ctx, { serviceId: serviceA.id, price: '100.00' });
    await sale(ctx, { serviceId: serviceA.id, price: '50.00' });
    await sale(ctx, { serviceId: serviceB.id, price: '30.00' });
    setSessionUser(ctx.user);

    const { props } = await render(ctx.company.id, { groupBy: 'service', searched: '1' });

    expect(props.rows).toHaveLength(2);
    expect(props.rows[0]).toMatchObject({ id: serviceA.id, salesCount: 2, revenue: 150, avgTicket: 75, revenuePct: 83.33 });
    expect(props.rows[1]).toMatchObject({ id: serviceB.id, revenue: 30 });
    expect(props.rows[0].salePrice).toBeUndefined();
    expect(props.summary).toMatchObject({ totalSales: 3, totalRevenue: 180, avgTicket: 60, topLabel: 'Servicio A' });
    expect(props.meta.total).toBe(2);
  });

  it('only approved sales count unless a status is filtered explicitly', async () => {
    const ctx = await makeSaleContext(db);
    await sale(ctx, { price: '100.00' });
    await sale(ctx, { status: 'pending', price: '40.00' });
    await sale(ctx, { status: 'rejected', price: '20.00' });
    setSessionUser(ctx.user);

    const all = await render(ctx.company.id, { searched: '1' });
    const pending = await render(ctx.company.id, { searched: '1', status: 'pending' });

    expect(all.props.summary).toMatchObject({ totalSales: 1, totalRevenue: 100 });
    expect(pending.props.summary).toMatchObject({ totalSales: 1, totalRevenue: 40 });
  });

  it('groups sales by plan with plan reference data', async () => {
    const ctx = await makeSaleContext(db);
    const planA = await createPlan(db, { companyId: ctx.company.id, serviceId: ctx.service.id, name: 'Plan A', salePrice: '80.00', roiTargetPct: '40.00' });
    const planB = await createPlan(db, { companyId: ctx.company.id, serviceId: ctx.service.id, name: 'Plan B', salePrice: '20.00', roiTargetPct: '10.00' });
    await sale(ctx, { planId: planA.id, price: '90.00' });
    await sale(ctx, { planId: planB.id, price: '25.00' });
    setSessionUser(ctx.user);

    const { props } = await render(ctx.company.id, { groupBy: 'plan', searched: '1' });

    expect(props.rows).toHaveLength(2);
    expect(props.rows[0]).toMatchObject({ id: planA.id, revenue: 90, salePrice: 80, roiTargetPct: 40 });
    expect(props.summary.topLabel).toBe('Plan A');
  });

  it('can be filtered by creation date range and capacity', async () => {
    const ctx = await makeSaleContext(db);
    await sale(ctx, { capacity: 'profile', price: '100.00', createdAt: new Date('2026-03-10T12:00:00Z') });
    await sale(ctx, { capacity: 'full_account', price: '200.00', createdAt: new Date('2026-03-12T12:00:00Z') });
    await sale(ctx, { capacity: 'profile', price: '999.00', createdAt: new Date('2026-05-01T12:00:00Z') });
    setSessionUser(ctx.user);

    const { props } = await render(ctx.company.id, {
      groupBy: 'service',
      capacity: 'profile',
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      searched: '1',
    });

    expect(props.rows).toHaveLength(1);
    expect(props.rows[0]).toMatchObject({ salesCount: 1, revenue: 100 });
    expect(props.summary).toMatchObject({ totalRevenue: 100, profileCount: 1, fullAccountCount: 0 });
  });

  it('only aggregates sales from the active company', async () => {
    const ctx = await makeSaleContext(db);
    const other = await makeSaleContext(db);
    await sale(ctx, { price: '100.00' });
    for (let i = 0; i < 3; i++) await sale(other, { price: '500.00' });
    setSessionUser(ctx.user);

    const { props } = await render(ctx.company.id, { searched: '1' });

    expect(props.rows).toHaveLength(1);
    expect(props.summary).toMatchObject({ totalSales: 1, totalRevenue: 100 });
    expect(props.meta.total).toBe(1);
  });
});
