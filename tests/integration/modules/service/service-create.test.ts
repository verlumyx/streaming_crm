import { beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { services } from '@/modules/service/models/service.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { createServiceAction } from '@/app/[companyId]/services/actions';
import ServiceCreatePage from '@/app/[companyId]/services/create/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { createUserWithCompany, assignRoleWithPermissions } from '../../../helpers/company-context';
import { createCompany } from '../../../factories/company.factory';
import { createService } from '../../../factories/catalog.factory';
import { formData } from '../../../helpers/form-data';

async function create(companyId: string, values: Record<string, string | number>) {
  return createServiceAction(companyId, initialActionState, formData({ id: uuidv7(), maxProfiles: 4, ...values }));
}

describe('Crear servicio', () => {
  beforeEach(resetDb);

  it('a service can be created', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const id = uuidv7();

    await expectRedirect(
      createServiceAction(
        company.id,
        initialActionState,
        formData({ id, name: 'Netflix', logoUrl: 'https://logo.test/netflix.png', maxProfiles: 5 }),
      ),
      `/${company.id}/services`,
    );

    const [row] = await db.select().from(services).where(eq(services.id, id));
    expect(row).toMatchObject({
      companyId: company.id,
      code: 'SER000001',
      name: 'Netflix',
      logoUrl: 'https://logo.test/netflix.png',
      maxProfiles: 5,
      active: true,
    });
  });

  it('the code auto-increments per company', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    await expectRedirect(create(company.id, { name: 'Netflix' }), `/${company.id}/services`);
    await expectRedirect(create(company.id, { name: 'Disney+' }), `/${company.id}/services`);

    const rows = await db.select().from(services).orderBy(asc(services.code));
    expect(rows.map((r) => r.code)).toEqual(['SER000001', 'SER000002']);
  });

  it('each company has its own code sequence', async () => {
    const a = await createUserWithCompany(db);
    const b = await createUserWithCompany(db);

    setSessionUser(a.user);
    await expectRedirect(create(a.company.id, { name: 'Netflix' }), `/${a.company.id}/services`);
    setSessionUser(b.user);
    await expectRedirect(create(b.company.id, { name: 'Netflix' }), `/${b.company.id}/services`);

    const [rowA] = await db.select().from(services).where(eq(services.companyId, a.company.id));
    const [rowB] = await db.select().from(services).where(eq(services.companyId, b.company.id));
    expect(rowA.code).toBe('SER000001');
    expect(rowB.code).toBe('SER000001');
  });

  it('concurrent creates never duplicate a code', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    await Promise.allSettled(Array.from({ length: 5 }, (_, i) => create(company.id, { name: `Servicio ${i}` })));

    const codes = (await db.select({ code: services.code }).from(services)).map((r) => r.code).sort();
    expect(codes).toEqual(['SER000001', 'SER000002', 'SER000003', 'SER000004', 'SER000005']);
  });

  it('a service can be created without optional fields', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const id = uuidv7();

    await expectRedirect(
      createServiceAction(company.id, initialActionState, formData({ id, name: 'Spotify', logoUrl: '', maxProfiles: 1 })),
      `/${company.id}/services`,
    );

    const [row] = await db.select().from(services).where(eq(services.id, id));
    expect(row.logoUrl).toBeNull();
  });

  it('the name is required', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await create(company.id, { name: '' });

    expect(result.status).toBe('error');
    expect(result.fieldErrors?.name?.[0]).toBe('El nombre es obligatorio.');
    expect(await db.select().from(services)).toHaveLength(0);
  });

  it('the name and logo url have a maximum length', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await create(company.id, { name: 'x'.repeat(101), logoUrl: 'y'.repeat(256) });

    expect(result.fieldErrors?.name?.[0]).toBe('El nombre no puede superar 100 caracteres.');
    expect(result.fieldErrors?.logoUrl?.[0]).toBe('La URL del logo no puede superar 255 caracteres.');
  });

  it('max profiles must be an integer of at least 1', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    expect((await create(company.id, { name: 'Bad', maxProfiles: 0 })).fieldErrors?.maxProfiles?.[0]).toBe(
      'El máximo de perfiles debe ser al menos 1.',
    );
    expect((await create(company.id, { name: 'Bad', maxProfiles: '' })).fieldErrors?.maxProfiles?.[0]).toBe(
      'El máximo de perfiles es obligatorio.',
    );
    expect((await create(company.id, { name: 'Bad', maxProfiles: '2.5' })).fieldErrors?.maxProfiles?.[0]).toBe(
      'El máximo de perfiles debe ser un número entero.',
    );
    expect(await db.select().from(services)).toHaveLength(0);
  });

  it('the name must be unique per company (case-insensitive)', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createService(db, { companyId: company.id, name: 'Netflix' });
    setSessionUser(user);

    const result = await create(company.id, { name: 'NETFLIX' });

    expect(result.fieldErrors?.name?.[0]).toBe('Ya existe un servicio con este nombre.');
  });

  it('the same name can exist in different companies', async () => {
    const { user, company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    await createService(db, { companyId: other.id, name: 'Netflix' });
    setSessionUser(user);

    await expectRedirect(create(company.id, { name: 'Netflix' }), `/${company.id}/services`);
  });

  it('a user without permission cannot create a service', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['services.list']);
    setSessionUser(user);

    const result = await create(company.id, { name: 'Forbidden' });

    expect(result).toMatchObject({ status: 'error', message: 'No tienes permiso para acceder a esta sección.' });
    expect(await db.select().from(services)).toHaveLength(0);
  });

  it('the create page renders with a draft id and is permission-protected', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const element = await ServiceCreatePage({ params: Promise.resolve({ companyId: company.id }) });
    expect(element.props.children.props).toMatchObject({ companyId: company.id, initialId: expect.any(String) });

    await assignRoleWithPermissions(db, user.id, company.id, ['services.list']);
    await expectRedirect(
      ServiceCreatePage({ params: Promise.resolve({ companyId: company.id }) }),
      `/${company.id}/dashboard?error=forbidden`,
    );
  });
});
