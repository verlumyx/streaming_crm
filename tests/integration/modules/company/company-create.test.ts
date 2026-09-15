import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { companies } from '@/modules/company/models/company.model';
import { roles, ADMINISTRATOR_ROLE_NAME } from '@/modules/role/models/role.model';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import { services } from '@/modules/service/models/service.model';
import { SeedCompanyServicesService } from '@/modules/service/services/seed-company-services.service';
import { streamingConfig } from '@/config/streaming';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { createCompanyAction } from '@/app/[companyId]/companies/actions';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { createUserWithCompany } from '../../../helpers/company-context';
import { createCompany } from '../../../factories/company.factory';
import { formData } from '../../../helpers/form-data';

async function ownerContext() {
  const ctx = await createUserWithCompany(db, { isSystemOwner: true });
  setSessionUser(ctx.user);
  return ctx;
}

function create(companyId: string, values: Record<string, string>) {
  return createCompanyAction(companyId, initialActionState, formData({ id: uuidv7(), ...values }));
}

describe('Crear empresa', () => {
  beforeEach(resetDb);
  afterEach(() => vi.restoreAllMocks());

  it('a system owner creates a company with its Administrador role, default membership and services', async () => {
    const { user, company: current } = await ownerContext();
    const id = uuidv7();

    await expectRedirect(
      createCompanyAction(
        current.id,
        initialActionState,
        formData({ id, name: 'Nueva Empresa', description: 'Desc' }),
      ),
      `/${current.id}/companies`,
    );

    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    expect(company).toMatchObject({
      name: 'Nueva Empresa',
      description: 'Desc',
      status: 'active',
      createdBy: user.id,
    });

    const companyRoles = await db.select().from(roles).where(eq(roles.companyId, id));
    expect(companyRoles).toHaveLength(1);
    expect(companyRoles[0]).toMatchObject({
      name: ADMINISTRATOR_ROLE_NAME,
      permissionType: 'all',
      status: 'active',
      description: 'Rol administrador de la empresa',
    });

    const [membership] = await db
      .select()
      .from(userCompanies)
      .where(and(eq(userCompanies.userId, user.id), eq(userCompanies.companyId, id)));
    expect(membership).toMatchObject({ roleId: companyRoles[0].id, status: 'active', isDefault: true });

    const companyServices = await db.select().from(services).where(eq(services.companyId, id));
    expect(companyServices).toHaveLength(streamingConfig.defaultServices.length);
    expect(companyServices).toHaveLength(9);
  });

  it('the new company becomes the only default membership of the creator', async () => {
    const { user, company: current } = await ownerContext();
    const id = uuidv7();

    await expectRedirect(
      createCompanyAction(current.id, initialActionState, formData({ id, name: 'Por defecto' })),
      `/${current.id}/companies`,
    );

    const memberships = await db.select().from(userCompanies).where(eq(userCompanies.userId, user.id));
    expect(memberships).toHaveLength(2);
    expect(memberships.filter((m) => m.isDefault).map((m) => m.companyId)).toEqual([id]);
  });

  it('the description is optional', async () => {
    const { company: current } = await ownerContext();
    const id = uuidv7();

    await expectRedirect(
      createCompanyAction(
        current.id,
        initialActionState,
        formData({ id, name: 'Sin descripción', description: '' }),
      ),
      `/${current.id}/companies`,
    );

    const [row] = await db.select().from(companies).where(eq(companies.id, id));
    expect(row.description).toBeNull();
  });

  it('nothing persists when a step of the creation fails', async () => {
    const { user, company: current } = await ownerContext();
    vi.spyOn(SeedCompanyServicesService.prototype, 'execute').mockRejectedValueOnce(new Error('seed failed'));

    await expect(create(current.id, { name: 'Rollback SA' })).rejects.toThrow('seed failed');

    expect(await db.select().from(companies).where(eq(companies.name, 'Rollback SA'))).toHaveLength(0);
    expect(await db.select().from(roles)).toHaveLength(1);
    const memberships = await db.select().from(userCompanies).where(eq(userCompanies.userId, user.id));
    expect(memberships).toEqual([expect.objectContaining({ companyId: current.id, isDefault: true })]);
  });

  it('the name is required', async () => {
    const { company: current } = await ownerContext();

    const result = await create(current.id, { name: '   ' });

    expect(result.status).toBe('error');
    expect(result.fieldErrors?.name?.[0]).toBe('El nombre es obligatorio.');
  });

  it('the name cannot exceed 255 characters', async () => {
    const { company: current } = await ownerContext();

    const result = await create(current.id, { name: 'a'.repeat(256) });

    expect(result.fieldErrors?.name?.[0]).toBe('El nombre no puede superar 255 caracteres.');
  });

  it('the id must be a uuid', async () => {
    const { company: current } = await ownerContext();

    const result = await createCompanyAction(
      current.id,
      initialActionState,
      formData({ id: 'nope', name: 'X' }),
    );

    expect(result.fieldErrors?.id?.[0]).toBe('El identificador no es válido.');
  });

  it('the name must be unique globally (case-insensitive)', async () => {
    const { company: current } = await ownerContext();
    await createCompany(db, { name: 'Acme Streaming' });

    const result = await create(current.id, { name: 'ACME streaming' });

    expect(result).toMatchObject({
      status: 'error',
      fieldErrors: { name: ['Ya existe una empresa con este nombre.'] },
    });
    expect(await db.select().from(companies)).toHaveLength(2);
  });

  it('concurrent creates with the same name store only one company', async () => {
    const { company: current } = await ownerContext();

    const results = await Promise.allSettled([
      create(current.id, { name: 'Carrera' }),
      create(current.id, { name: 'Carrera' }),
    ]);

    expect(await db.select().from(companies).where(eq(companies.name, 'Carrera'))).toHaveLength(1);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled).toHaveLength(1);
    expect(
      (fulfilled[0] as PromiseFulfilledResult<{ fieldErrors?: Record<string, string[]> }>).value.fieldErrors
        ?.name,
    ).toEqual(['Ya existe una empresa con este nombre.']);
  });
});
