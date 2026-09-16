import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { plans } from '@/modules/plan/models/plan.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { updatePlanAction, updatePlanStatusAction } from '@/app/[companyId]/plans/actions';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { createPlan, createService } from '../../../factories/catalog.factory';
import { createCompany } from '../../../factories/company.factory';
import { formData } from '../../../helpers/form-data';

const values = (serviceId: string, overrides: Record<string, string | number> = {}) =>
  formData({
    serviceId,
    name: 'Netflix Trimestral',
    capacity: 'full_account',
    durationDays: 15,
    salePrice: 30,
    roiTargetPct: 55,
    ...overrides,
  });

describe('Actualizar plan', () => {
  beforeEach(resetDb);

  it('a plan can be updated', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    const other = await createService(db, { companyId: company.id });
    const plan = await createPlan(db, { companyId: company.id, serviceId: service.id, name: 'Netflix Mensual' });
    setSessionUser(user);

    await expectRedirect(
      updatePlanAction(company.id, plan.id, initialActionState, values(other.id)),
      `/${company.id}/plans/${plan.id}`,
    );

    const [row] = await db.select().from(plans).where(eq(plans.id, plan.id));
    expect(row).toMatchObject({
      serviceId: other.id,
      name: 'Netflix Trimestral',
      capacity: 'full_account',
      durationDays: 15,
      salePrice: '30.00',
      roiTargetPct: '55.00',
      code: plan.code,
      active: plan.active,
    });
  });

  it('a plan from another company cannot be updated', async () => {
    const { user, company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    const service = await createService(db, { companyId: company.id });
    const otherService = await createService(db, { companyId: other.id });
    const plan = await createPlan(db, { companyId: other.id, serviceId: otherService.id, name: 'Ajeno' });
    setSessionUser(user);

    const result = await updatePlanAction(company.id, plan.id, initialActionState, values(service.id, { name: 'Hacked' }));

    expect(result).toMatchObject({ status: 'error', message: 'Plan no encontrado.' });
    const [row] = await db.select().from(plans).where(eq(plans.id, plan.id));
    expect(row.name).toBe('Ajeno');
  });

  it('a plan cannot be moved to a service of another company', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    const foreign = await createService(db, { companyId: (await createCompany(db)).id });
    const plan = await createPlan(db, { companyId: company.id, serviceId: service.id });
    setSessionUser(user);

    const result = await updatePlanAction(company.id, plan.id, initialActionState, values(foreign.id));

    expect(result.fieldErrors?.serviceId?.[0]).toBe('El servicio seleccionado no es válido.');
    const [row] = await db.select().from(plans).where(eq(plans.id, plan.id));
    expect(row.serviceId).toBe(service.id);
  });

  it('the input is validated and an invalid id is not found', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    const plan = await createPlan(db, { companyId: company.id, serviceId: service.id });
    setSessionUser(user);

    const invalid = await updatePlanAction(
      company.id,
      plan.id,
      initialActionState,
      values(service.id, { name: '', durationDays: 0, salePrice: -1 }),
    );
    expect(invalid.fieldErrors).toMatchObject({
      name: ['El nombre es obligatorio.'],
      durationDays: ['La duración debe ser 1, 3, 7, 15 o 30 días.'],
      salePrice: ['El precio de venta no puede ser negativo.'],
    });

    expect(await updatePlanAction(company.id, uuidv7(), initialActionState, values(service.id))).toMatchObject({
      message: 'Plan no encontrado.',
    });
    expect(await updatePlanAction(company.id, 'nope', initialActionState, values(service.id))).toMatchObject({
      message: 'Plan no encontrado.',
    });
  });

  it('a user without permission cannot update a plan', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    const plan = await createPlan(db, { companyId: company.id, serviceId: service.id, name: 'Original' });
    await assignRoleWithPermissions(db, user.id, company.id, ['plans.list']);
    setSessionUser(user);

    const result = await updatePlanAction(company.id, plan.id, initialActionState, values(service.id, { name: 'Nope' }));

    expect(result.status).toBe('error');
    const [row] = await db.select().from(plans).where(eq(plans.id, plan.id));
    expect(row.name).toBe('Original');
  });
});

describe('Actualizar estado del plan', () => {
  beforeEach(resetDb);

  it('a plan can be deactivated and reactivated', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    const plan = await createPlan(db, { companyId: company.id, serviceId: service.id, active: true });
    setSessionUser(user);

    await expectRedirect(updatePlanStatusAction(company.id, plan.id, false), `/${company.id}/plans`);
    let [row] = await db.select().from(plans).where(eq(plans.id, plan.id));
    expect(row.active).toBe(false);

    await expectRedirect(updatePlanStatusAction(company.id, plan.id, '1', 'show'), `/${company.id}/plans/${plan.id}`);
    [row] = await db.select().from(plans).where(eq(plans.id, plan.id));
    expect(row.active).toBe(true);
  });

  it('the status must be a valid value and the plan must exist in the company', async () => {
    const { user, company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    const otherService = await createService(db, { companyId: other.id });
    const foreign = await createPlan(db, { companyId: other.id, serviceId: otherService.id, active: true });
    setSessionUser(user);

    expect((await updatePlanStatusAction(company.id, foreign.id, 'maybe')).fieldErrors?.active?.[0]).toBe(
      'El estado no es válido.',
    );
    expect(await updatePlanStatusAction(company.id, foreign.id, false)).toMatchObject({ message: 'Plan no encontrado.' });
    const [row] = await db.select().from(plans).where(eq(plans.id, foreign.id));
    expect(row.active).toBe(true);
  });

  it('a user without permission cannot change the plan status', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    const plan = await createPlan(db, { companyId: company.id, serviceId: service.id, active: true });
    await assignRoleWithPermissions(db, user.id, company.id, ['plans.list']);
    setSessionUser(user);

    const result = await updatePlanStatusAction(company.id, plan.id, false);

    expect(result.status).toBe('error');
    const [row] = await db.select().from(plans).where(eq(plans.id, plan.id));
    expect(row.active).toBe(true);
  });
});
