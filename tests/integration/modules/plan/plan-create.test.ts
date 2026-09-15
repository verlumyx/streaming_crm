import { beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { plans } from '@/modules/plan/models/plan.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { createPlanAction } from '@/app/[companyId]/plans/actions';
import PlanCreatePage from '@/app/[companyId]/plans/create/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { createUserWithCompany, assignRoleWithPermissions } from '../../../helpers/company-context';
import { createService } from '../../../factories/catalog.factory';
import { createCompany } from '../../../factories/company.factory';
import { formData } from '../../../helpers/form-data';

type Payload = Record<string, string | number>;

const payload = (serviceId: string, overrides: Payload = {}): Payload => ({
  id: uuidv7(),
  serviceId,
  name: 'Netflix Mensual',
  capacity: 'profile',
  durationDays: 30,
  salePrice: 12.5,
  roiTargetPct: 40,
  ...overrides,
});

const create = (companyId: string, values: Payload) => createPlanAction(companyId, initialActionState, formData(values));

describe('Crear plan', () => {
  beforeEach(resetDb);

  it('a plan can be created', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    setSessionUser(user);
    const id = uuidv7();

    await expectRedirect(create(company.id, payload(service.id, { id })), `/${company.id}/plans`);

    const [row] = await db.select().from(plans).where(eq(plans.id, id));
    expect(row).toMatchObject({
      companyId: company.id,
      serviceId: service.id,
      code: 'PLA000001',
      name: 'Netflix Mensual',
      capacity: 'profile',
      durationDays: 30,
      salePrice: '12.50',
      roiTargetPct: '40.00',
      active: true,
    });
  });

  it('the code auto-increments per company and names may repeat', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    setSessionUser(user);

    await expectRedirect(create(company.id, payload(service.id)), `/${company.id}/plans`);
    await expectRedirect(create(company.id, payload(service.id)), `/${company.id}/plans`);

    const rows = await db.select().from(plans).orderBy(asc(plans.code));
    expect(rows.map((r) => r.code)).toEqual(['PLA000001', 'PLA000002']);
  });

  it('each company has its own code sequence', async () => {
    const a = await createUserWithCompany(db);
    const b = await createUserWithCompany(db);
    const serviceA = await createService(db, { companyId: a.company.id });
    const serviceB = await createService(db, { companyId: b.company.id });

    setSessionUser(a.user);
    await expectRedirect(create(a.company.id, payload(serviceA.id)), `/${a.company.id}/plans`);
    setSessionUser(b.user);
    await expectRedirect(create(b.company.id, payload(serviceB.id)), `/${b.company.id}/plans`);

    const [rowA] = await db.select().from(plans).where(eq(plans.companyId, a.company.id));
    const [rowB] = await db.select().from(plans).where(eq(plans.companyId, b.company.id));
    expect(rowA.code).toBe('PLA000001');
    expect(rowB.code).toBe('PLA000001');
  });

  it('concurrent creates never duplicate a code', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    setSessionUser(user);

    await Promise.allSettled(Array.from({ length: 4 }, () => create(company.id, payload(service.id))));

    const codes = (await db.select({ code: plans.code }).from(plans)).map((r) => r.code).sort();
    expect(codes).toEqual(['PLA000001', 'PLA000002', 'PLA000003', 'PLA000004']);
  });

  it('the name is required', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    setSessionUser(user);

    const result = await create(company.id, payload(service.id, { name: '' }));

    expect(result.fieldErrors?.name?.[0]).toBe('El nombre es obligatorio.');
    expect(await db.select().from(plans)).toHaveLength(0);
  });

  it('the capacity must be a valid value', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    setSessionUser(user);

    const result = await create(company.id, payload(service.id, { capacity: 'shared' }));

    expect(result.fieldErrors?.capacity?.[0]).toBe('La capacidad no es válida.');
  });

  it('the duration must be an integer of at least 1 day', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    setSessionUser(user);

    expect((await create(company.id, payload(service.id, { durationDays: 0 }))).fieldErrors?.durationDays?.[0]).toBe(
      'La duración debe ser al menos 1 día.',
    );
    expect((await create(company.id, payload(service.id, { durationDays: '' }))).fieldErrors?.durationDays?.[0]).toBe(
      'La duración es obligatorio.',
    );
    expect(
      (await create(company.id, payload(service.id, { durationDays: '1.5' }))).fieldErrors?.durationDays?.[0],
    ).toBe('La duración debe ser un número entero de días.');
  });

  it('the sale price and the ROI target cannot be negative', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    setSessionUser(user);

    const result = await create(company.id, payload(service.id, { salePrice: -1, roiTargetPct: -5 }));

    expect(result.fieldErrors?.salePrice?.[0]).toBe('El precio de venta no puede ser negativo.');
    expect(result.fieldErrors?.roiTargetPct?.[0]).toBe('La meta de ROI no puede ser negativa.');
    expect(await db.select().from(plans)).toHaveLength(0);
  });

  it('the numeric fields are bounded by their columns', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    setSessionUser(user);

    const result = await create(company.id, payload(service.id, { salePrice: 100_000_000, roiTargetPct: 1000 }));

    expect(result.fieldErrors?.salePrice?.[0]).toBe('El precio de venta es demasiado alto.');
    expect(result.fieldErrors?.roiTargetPct?.[0]).toBe('La meta de ROI no puede superar 999,99%.');
  });

  it('the service is required and must belong to the current company', async () => {
    const { user, company } = await createUserWithCompany(db);
    const foreign = await createService(db, { companyId: (await createCompany(db)).id });
    setSessionUser(user);

    expect((await create(company.id, payload('', {}))).fieldErrors?.serviceId?.[0]).toBe('Selecciona un servicio válido.');
    expect((await create(company.id, payload(foreign.id))).fieldErrors?.serviceId?.[0]).toBe(
      'El servicio seleccionado no es válido.',
    );
    expect(await db.select().from(plans)).toHaveLength(0);
  });

  it('a user without permission cannot create a plan', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    await assignRoleWithPermissions(db, user.id, company.id, ['plans.list']);
    setSessionUser(user);

    const result = await create(company.id, payload(service.id));

    expect(result).toMatchObject({ status: 'error', message: 'No tienes permiso para acceder a esta sección.' });
    expect(await db.select().from(plans)).toHaveLength(0);
  });

  it('the create page exposes only the active services of the company', async () => {
    const { user, company } = await createUserWithCompany(db);
    const active = await createService(db, { companyId: company.id, name: 'Netflix' });
    await createService(db, { companyId: company.id, name: 'Inactivo', active: false });
    await createService(db, { companyId: (await createCompany(db)).id, name: 'Ajeno' });
    setSessionUser(user);

    const element = await PlanCreatePage({ params: Promise.resolve({ companyId: company.id }) });

    expect(element.props.children.props.services).toEqual([
      { id: active.id, code: active.code, name: 'Netflix', maxProfiles: active.maxProfiles },
    ]);
  });

  it('a user without permission cannot open the create page', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['plans.list']);
    setSessionUser(user);

    await expectRedirect(
      PlanCreatePage({ params: Promise.resolve({ companyId: company.id }) }),
      `/${company.id}/dashboard?error=forbidden`,
    );
  });
});
