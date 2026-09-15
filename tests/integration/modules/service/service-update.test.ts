import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { services } from '@/modules/service/models/service.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { updateServiceAction, updateServiceStatusAction } from '@/app/[companyId]/services/actions';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { createService } from '../../../factories/catalog.factory';
import { createCompany } from '../../../factories/company.factory';
import { formData } from '../../../helpers/form-data';

describe('Actualizar servicio', () => {
  beforeEach(resetDb);

  it('a service can be updated', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id, name: 'Netflix', maxProfiles: 4 });
    setSessionUser(user);

    await expectRedirect(
      updateServiceAction(
        company.id,
        service.id,
        initialActionState,
        formData({ name: 'Netflix Premium', logoUrl: 'https://logo.test/np.png', maxProfiles: 6 }),
      ),
      `/${company.id}/services/${service.id}`,
    );

    const [row] = await db.select().from(services).where(eq(services.id, service.id));
    expect(row).toMatchObject({ name: 'Netflix Premium', logoUrl: 'https://logo.test/np.png', maxProfiles: 6 });
    expect(row.code).toBe(service.code);
    expect(row.active).toBe(service.active);
  });

  it('the name remains editable to its own value', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id, name: 'Netflix' });
    setSessionUser(user);

    await expectRedirect(
      updateServiceAction(company.id, service.id, initialActionState, formData({ name: 'Netflix', maxProfiles: 3 })),
      `/${company.id}/services/${service.id}`,
    );
  });

  it('the name cannot collide with another service in the same company', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createService(db, { companyId: company.id, name: 'Disney+' });
    const service = await createService(db, { companyId: company.id, name: 'Netflix' });
    setSessionUser(user);

    const result = await updateServiceAction(
      company.id,
      service.id,
      initialActionState,
      formData({ name: 'disney+', maxProfiles: 3 }),
    );

    expect(result.fieldErrors?.name?.[0]).toBe('Ya existe un servicio con este nombre.');
  });

  it('the input is validated', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    setSessionUser(user);

    const result = await updateServiceAction(company.id, service.id, initialActionState, formData({ name: '', maxProfiles: 0 }));

    expect(result.fieldErrors?.name?.[0]).toBe('El nombre es obligatorio.');
    expect(result.fieldErrors?.maxProfiles?.[0]).toBe('El máximo de perfiles debe ser al menos 1.');
  });

  it('updating a missing or foreign service returns an error', async () => {
    const { user, company } = await createUserWithCompany(db);
    const foreign = await createService(db, { companyId: (await createCompany(db)).id, name: 'Ajeno' });
    setSessionUser(user);
    const values = formData({ name: 'Hacked', maxProfiles: 1 });

    expect(await updateServiceAction(company.id, uuidv7(), initialActionState, values)).toMatchObject({
      status: 'error',
      message: 'Servicio no encontrado.',
    });
    expect(await updateServiceAction(company.id, foreign.id, initialActionState, values)).toMatchObject({
      status: 'error',
      message: 'Servicio no encontrado.',
    });
    expect(await updateServiceAction(company.id, 'not-a-uuid', initialActionState, values)).toMatchObject({
      status: 'error',
      message: 'Servicio no encontrado.',
    });
    const [row] = await db.select().from(services).where(eq(services.id, foreign.id));
    expect(row.name).toBe('Ajeno');
  });

  it('a user without permission cannot update a service', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id, name: 'Original' });
    await assignRoleWithPermissions(db, user.id, company.id, ['services.list']);
    setSessionUser(user);

    const result = await updateServiceAction(
      company.id,
      service.id,
      initialActionState,
      formData({ name: 'Hacked', maxProfiles: 1 }),
    );

    expect(result.status).toBe('error');
    const [row] = await db.select().from(services).where(eq(services.id, service.id));
    expect(row.name).toBe('Original');
  });
});

describe('Actualizar estado del servicio', () => {
  beforeEach(resetDb);

  it('a service can be deactivated and reactivated', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id, active: true });
    setSessionUser(user);

    await expectRedirect(updateServiceStatusAction(company.id, service.id, false), `/${company.id}/services`);
    let [row] = await db.select().from(services).where(eq(services.id, service.id));
    expect(row.active).toBe(false);

    await expectRedirect(
      updateServiceStatusAction(company.id, service.id, 'true', 'show'),
      `/${company.id}/services/${service.id}`,
    );
    [row] = await db.select().from(services).where(eq(services.id, service.id));
    expect(row.active).toBe(true);
  });

  it('the status accepts its form spelling', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id, active: true });
    setSessionUser(user);

    await expectRedirect(updateServiceStatusAction(company.id, service.id, '0'), `/${company.id}/services`);
    const [row] = await db.select().from(services).where(eq(services.id, service.id));
    expect(row.active).toBe(false);
  });

  it('the status must be a valid value', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id });
    setSessionUser(user);

    const result = await updateServiceStatusAction(company.id, service.id, 'deleted');

    expect(result.fieldErrors?.active?.[0]).toBe('El estado no es válido.');
  });

  it('a user without permission cannot change the status', async () => {
    const { user, company } = await createUserWithCompany(db);
    const service = await createService(db, { companyId: company.id, active: true });
    await assignRoleWithPermissions(db, user.id, company.id, ['services.list']);
    setSessionUser(user);

    const result = await updateServiceStatusAction(company.id, service.id, false);

    expect(result.status).toBe('error');
    const [row] = await db.select().from(services).where(eq(services.id, service.id));
    expect(row.active).toBe(true);
  });
});
