import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { todayIsoDate } from '@/lib/format';
import { shiftMonth } from '@/modules/dashboard/domain/months';
import MovementsReportPage from '@/app/[companyId]/reports/movements/page';
import IncomeExpensesReportPage from '@/app/[companyId]/reports/income-expenses/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { createCompany } from '../../../factories/company.factory';
import { createTransaction } from '../../../factories/transaction.factory';

const render = (page: typeof MovementsReportPage, companyId: string, query: Record<string, string> = {}) =>
  page({ params: Promise.resolve({ companyId }), searchParams: Promise.resolve(query) });

describe('Reporte de movimientos', () => {
  beforeEach(resetDb);

  it('renders empty until a search is performed', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createTransaction(db, { companyId: company.id });
    setSessionUser(user);

    const { props } = await render(MovementsReportPage, company.id);

    expect(props).toMatchObject({ searched: false, movements: [], meta: { total: 0 } });
  });

  it('renders the movements once searched, only from the active company', async () => {
    const { user, company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    for (let i = 0; i < 3; i++) await createTransaction(db, { companyId: company.id });
    for (let i = 0; i < 2; i++) await createTransaction(db, { companyId: other.id });
    setSessionUser(user);

    const { props } = await render(MovementsReportPage, company.id, { searched: '1' });

    expect(props.searched).toBe(true);
    expect(props.movements).toHaveLength(3);
    expect(props.meta.total).toBe(3);
  });

  it('filters by type, category and date range', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createTransaction(db, { companyId: company.id, category: 'sale', date: '2026-01-15' });
    await createTransaction(db, { companyId: company.id, category: 'salary', date: '2026-03-20' });
    await createTransaction(db, { companyId: company.id, category: 'marketing', date: '2026-06-10' });
    setSessionUser(user);

    const byType = await render(MovementsReportPage, company.id, { type: 'income', searched: '1' });
    const byCategory = await render(MovementsReportPage, company.id, { category: 'salary', searched: '1' });
    const byDate = await render(MovementsReportPage, company.id, { dateFrom: '2026-02-01', dateTo: '2026-04-01', searched: '1' });

    expect(byType.props.movements.map((m: { category: string }) => m.category)).toEqual(['sale']);
    expect(byCategory.props.movements).toHaveLength(1);
    expect(byCategory.props.movements[0].category).toBe('salary');
    expect(byDate.props.movements.map((m: { date: string }) => m.date)).toEqual(['2026-03-20']);
  });

  it('paginates results', async () => {
    const { user, company } = await createUserWithCompany(db);
    for (let i = 0; i < 25; i++) await createTransaction(db, { companyId: company.id });
    setSessionUser(user);

    const { props } = await render(MovementsReportPage, company.id, { limit: '20', searched: '1' });

    expect(props.movements).toHaveLength(20);
    expect(props.meta).toMatchObject({ total: 25, hasMore: true });
  });

  it('a user without permission cannot view it', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, []);
    setSessionUser(user);

    await expectRedirect(render(MovementsReportPage, company.id), `/${company.id}/dashboard?error=forbidden`);
  });
});

describe('Reporte de ingresos y gastos', () => {
  beforeEach(resetDb);

  it('renders empty with the current-month range until a search is performed', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createTransaction(db, { companyId: company.id, date: todayIsoDate() });
    setSessionUser(user);

    const { props } = await render(IncomeExpensesReportPage, company.id);

    const today = todayIsoDate();
    expect(props).toMatchObject({
      searched: false,
      movements: [],
      filters: { dateFrom: shiftMonth(today, 0).from, dateTo: today },
      summary: { totalIncome: 0, totalExpense: 0, balance: 0 },
    });
  });

  it('uses the current month as the default range once searched', async () => {
    const { user, company } = await createUserWithCompany(db);
    const today = todayIsoDate();
    const monthStart = shiftMonth(today, 0).from;
    const previousMonthEnd = shiftMonth(today, -1).to;
    await createTransaction(db, { companyId: company.id, category: 'sale', amount: 100, date: today });
    await createTransaction(db, { companyId: company.id, category: 'salary', amount: 30, date: monthStart });
    await createTransaction(db, { companyId: company.id, category: 'sale', amount: 999, date: previousMonthEnd });
    setSessionUser(user);

    const { props } = await render(IncomeExpensesReportPage, company.id, { searched: '1' });

    expect(props.movements).toHaveLength(2);
    expect(props.summary).toEqual({ totalIncome: 100, totalExpense: 30, balance: 70, incomeCount: 1, expenseCount: 1 });
  });

  it('can be filtered by an explicit range and the totals reflect it', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createTransaction(db, { companyId: company.id, category: 'sale', amount: 200, date: '2026-03-05' });
    await createTransaction(db, { companyId: company.id, category: 'renewal', amount: 50, date: '2026-03-12' });
    await createTransaction(db, { companyId: company.id, category: 'salary', amount: 75, date: '2026-03-20' });
    await createTransaction(db, { companyId: company.id, category: 'sale', amount: 999, date: '2026-05-01' });
    setSessionUser(user);

    const { props } = await render(IncomeExpensesReportPage, company.id, { dateFrom: '2026-03-01', dateTo: '2026-03-31', searched: '1' });

    expect(props.meta.total).toBe(3);
    expect(props.summary).toEqual({ totalIncome: 250, totalExpense: 75, balance: 175, incomeCount: 2, expenseCount: 1 });
  });

  it('only shows movements from the active company', async () => {
    const { user, company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    await createTransaction(db, { companyId: company.id, date: todayIsoDate() });
    await createTransaction(db, { companyId: other.id, date: todayIsoDate() });
    setSessionUser(user);

    const { props } = await render(IncomeExpensesReportPage, company.id, { searched: '1' });

    expect(props.meta.total).toBe(1);
  });

  it('a user without permission cannot view it', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['reports.movements']);
    setSessionUser(user);

    await expectRedirect(render(IncomeExpensesReportPage, company.id), `/${company.id}/dashboard?error=forbidden`);
  });
});
