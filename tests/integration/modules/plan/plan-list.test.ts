import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import PlansPage from '@/app/[companyId]/plans/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { createUserWithCompany, assignRoleWithPermissions } from '../../../helpers/company-context';
import { createPlan, createService } from '../../../factories/catalog.factory';
import { createCompany } from '../../../factories/company.factory';

type PlanProps = { id: string; name: string };

async function renderList(companyId: string, searchParams: Record<string, string> = {}) {
  const element = await PlansPage({ params: Promise.resolve({ companyId }), searchParams: Promise.resolve(searchParams) });
  return element.props as { plans: PlanProps[]; services: { id: string }[]; meta: { total: number }; filters: object };
}

describe('Listar planes', () => {
  beforeEach(resetDb);

  it('the plans index renders with plans and their service', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id, name: 'Netflix' });
    await createPlan(db, { companyId: company.id, serviceId: service.id });
    await createPlan(db, { companyId: company.id, serviceId: service.id });
    await createPlan(db, { companyId: company.id, serviceId: service.id, salePrice: '12.50' });
    setSessionUser(user);

    const props = await renderList(company.id);

    expect(props.plans).toHaveLength(3);
    expect(props.meta).toMatchObject({ total: 3, limit: 20, offset: 0, hasMore: false });
    expect(props.plans[0]).toMatchObject({ salePrice: 12.5, service: { id: service.id, name: 'Netflix' } });
  });

  it('the index exposes the active services for the service filter', async () => {
    const { user, company } = await createUserWithCompany(db);
    const active = await createService(db, { companyId: company.id });
    await createService(db, { companyId: company.id, active: false });
    setSessionUser(user);

    const props = await renderList(company.id);

    expect(props.services.map((s) => s.id)).toEqual([active.id]);
  });

  it('plans can be filtered by name and code', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    await createPlan(db, { companyId: company.id, serviceId: service.id, name: 'Netflix Mensual', code: 'PLA000010' });
    await createPlan(db, { companyId: company.id, serviceId: service.id, name: 'Disney Anual', code: 'PLA000020' });
    setSessionUser(user);

    expect((await renderList(company.id, { name: 'netflix' })).plans.map((p) => p.name)).toEqual(['Netflix Mensual']);
    expect((await renderList(company.id, { code: '020' })).plans.map((p) => p.name)).toEqual(['Disney Anual']);
  });

  it('plans can be filtered by capacity', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    const target = await createPlan(db, { companyId: company.id, serviceId: service.id, capacity: 'full_account' });
    await createPlan(db, { companyId: company.id, serviceId: service.id, capacity: 'profile' });
    setSessionUser(user);

    expect((await renderList(company.id, { capacity: 'full_account' })).plans.map((p) => p.id)).toEqual([target.id]);
    expect((await renderList(company.id, { capacity: 'shared' })).meta.total).toBe(2);
  });

  it('plans can be filtered by service', async () => {
    const { user, company } = await createUserWithCompany(db);
    const netflix = await createService(db, { companyId: company.id });
    const disney = await createService(db, { companyId: company.id });
    const target = await createPlan(db, { companyId: company.id, serviceId: disney.id });
    await createPlan(db, { companyId: company.id, serviceId: netflix.id });
    setSessionUser(user);

    const props = await renderList(company.id, { serviceId: disney.id });

    expect(props.plans.map((p) => p.id)).toEqual([target.id]);
    expect(props.filters).toEqual({ serviceId: disney.id });
    expect((await renderList(company.id, { serviceId: 'not-a-uuid' })).meta.total).toBe(2);
  });

  it('plans can be filtered by active state', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    const active = await createPlan(db, { companyId: company.id, serviceId: service.id, active: true });
    const inactive = await createPlan(db, { companyId: company.id, serviceId: service.id, active: false });
    setSessionUser(user);

    expect((await renderList(company.id, { active: '1' })).plans.map((p) => p.id)).toEqual([active.id]);
    expect((await renderList(company.id, { active: '0' })).plans.map((p) => p.id)).toEqual([inactive.id]);
  });

  it('plans are scoped to the current company', async () => {
    const { user, company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    const service = await createService(db, { companyId: company.id });
    const otherService = await createService(db, { companyId: other.id });
    await createPlan(db, { companyId: company.id, serviceId: service.id });
    await createPlan(db, { companyId: other.id, serviceId: otherService.id });
    setSessionUser(user);

    const props = await renderList(company.id);

    expect(props.meta.total).toBe(1);
    expect(props.plans).toHaveLength(1);
  });

  it('a user without permission cannot list plans', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['services.list']);
    setSessionUser(user);

    await expectRedirect(
      PlansPage({ params: Promise.resolve({ companyId: company.id }), searchParams: Promise.resolve({}) }),
      `/${company.id}/dashboard?error=forbidden`,
    );
  });
});
