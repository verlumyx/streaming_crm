import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { uuidv7 } from '@/modules/shared/uuid';
import PlanShowPage from '@/app/[companyId]/plans/[id]/page';
import PlanEditPage from '@/app/[companyId]/plans/[id]/edit/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectNotFound, expectRedirect } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { createPlan, createService } from '../../../factories/catalog.factory';
import { createCompany } from '../../../factories/company.factory';

const params = (companyId: string, id: string) => ({ params: Promise.resolve({ companyId, id }) });

describe('Ver plan', () => {
  beforeEach(resetDb);

  it('the plan show page renders with the plan and its service', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id, name: 'Netflix' });
    const plan = await createPlan(db, {
      companyId: company.id,
      serviceId: service.id,
      salePrice: '12.50',
      roiTargetPct: '40.25',
      durationDays: 90,
    });
    setSessionUser(user);

    const element = await PlanShowPage(params(company.id, plan.id));

    expect(element.props.plan).toMatchObject({
      id: plan.id,
      code: plan.code,
      salePrice: 12.5,
      roiTargetPct: 40.25,
      durationDays: 90,
      service: { id: service.id, name: 'Netflix' },
    });
    expect(element.props).toMatchObject({ canUpdate: true, canUpdateStatus: true });
  });

  it('the edit page renders with the active services', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id, name: 'Netflix' });
    const other = await createService(db, { companyId: company.id, name: 'Disney+' });
    const plan = await createPlan(db, { companyId: company.id, serviceId: service.id });
    setSessionUser(user);

    const element = await PlanEditPage(params(company.id, plan.id));
    const props = element.props.children.props;

    expect(props.plan).toMatchObject({ id: plan.id, serviceId: service.id });
    expect(props.services.map((s: { id: string }) => s.id).sort()).toEqual([service.id, other.id].sort());
  });

  it('the edit page keeps the current service selectable when it was deactivated', async () => {
    const { user, company } = await createUserWithCompany(db);
    const inactive = await createService(db, { companyId: company.id, active: false });
    const plan = await createPlan(db, { companyId: company.id, serviceId: inactive.id });
    setSessionUser(user);

    const element = await PlanEditPage(params(company.id, plan.id));

    expect(element.props.children.props.services.map((s: { id: string }) => s.id)).toEqual([inactive.id]);
  });

  it('showing a missing plan is a 404', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    await expectNotFound(PlanShowPage(params(company.id, uuidv7())));
    await expectNotFound(PlanShowPage(params(company.id, 'not-a-uuid')));
    await expectNotFound(PlanEditPage(params(company.id, uuidv7())));
  });

  it('a plan from another company cannot be shown', async () => {
    const { user, company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    const service = await createService(db, { companyId: other.id });
    const plan = await createPlan(db, { companyId: other.id, serviceId: service.id });
    setSessionUser(user);

    await expectNotFound(PlanShowPage(params(company.id, plan.id)));
    await expectNotFound(PlanEditPage(params(company.id, plan.id)));
  });

  it('a user without permission cannot view or edit a plan', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    const plan = await createPlan(db, { companyId: company.id, serviceId: service.id });
    await assignRoleWithPermissions(db, user.id, company.id, ['plans.list']);
    setSessionUser(user);

    await expectRedirect(PlanShowPage(params(company.id, plan.id)), `/${company.id}/dashboard?error=forbidden`);
    await expectRedirect(PlanEditPage(params(company.id, plan.id)), `/${company.id}/dashboard?error=forbidden`);
  });
});
