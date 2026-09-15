import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { companies } from '@/modules/company/models/company.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { updateCompanyAction, updateCompanyStatusAction } from '@/app/[companyId]/companies/actions';
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

describe('Actualizar empresa', () => {
  beforeEach(resetDb);

  it('a system owner can update a company', async () => {
    const { company } = await ownerContext();
    const target = await createCompany(db, { name: 'Original' });

    await expectRedirect(
      updateCompanyAction(
        company.id,
        target.id,
        initialActionState,
        formData({ name: 'Renombrada', description: 'Nueva' }),
      ),
      `/${company.id}/companies/${target.id}`,
    );

    const [row] = await db.select().from(companies).where(eq(companies.id, target.id));
    expect(row).toMatchObject({ name: 'Renombrada', description: 'Nueva', status: 'active' });
  });

  it('a company keeps its own name (even changing its casing)', async () => {
    const { company } = await ownerContext();
    const target = await createCompany(db, { name: 'Mi Nombre' });

    await expectRedirect(
      updateCompanyAction(company.id, target.id, initialActionState, formData({ name: 'MI NOMBRE' })),
      `/${company.id}/companies/${target.id}`,
    );
  });

  it('a company cannot take another company name', async () => {
    const { company } = await ownerContext();
    await createCompany(db, { name: 'Tomado' });
    const target = await createCompany(db, { name: 'Libre' });

    const result = await updateCompanyAction(
      company.id,
      target.id,
      initialActionState,
      formData({ name: 'tomado' }),
    );

    expect(result.fieldErrors?.name?.[0]).toBe('Ya existe una empresa con este nombre.');
    const [row] = await db.select().from(companies).where(eq(companies.id, target.id));
    expect(row.name).toBe('Libre');
  });

  it('the name is required when updating', async () => {
    const { company } = await ownerContext();

    const result = await updateCompanyAction(
      company.id,
      company.id,
      initialActionState,
      formData({ name: '' }),
    );

    expect(result.fieldErrors?.name?.[0]).toBe('El nombre es obligatorio.');
  });

  it('updating a missing company returns an error', async () => {
    const { company } = await ownerContext();

    expect(
      await updateCompanyAction(company.id, uuidv7(), initialActionState, formData({ name: 'X' })),
    ).toMatchObject({
      status: 'error',
      message: 'Empresa no encontrada.',
    });
    expect(
      await updateCompanyAction(company.id, 'bad', initialActionState, formData({ name: 'X' })),
    ).toMatchObject({
      status: 'error',
      message: 'Empresa no encontrada.',
    });
  });
});

describe('Actualizar estado de la empresa', () => {
  beforeEach(resetDb);

  it('a system owner can change a company status', async () => {
    const { company } = await ownerContext();
    const target = await createCompany(db, { status: 'active' });

    await expectRedirect(
      updateCompanyStatusAction(company.id, target.id, 'inactive'),
      `/${company.id}/companies`,
    );
    let [row] = await db.select().from(companies).where(eq(companies.id, target.id));
    expect(row.status).toBe('inactive');

    await expectRedirect(
      updateCompanyStatusAction(company.id, target.id, 'active', 'show'),
      `/${company.id}/companies/${target.id}`,
    );
    [row] = await db.select().from(companies).where(eq(companies.id, target.id));
    expect(row.status).toBe('active');
  });

  it('a system owner can deactivate the company they are working in', async () => {
    const { company } = await ownerContext();

    await expectRedirect(
      updateCompanyStatusAction(company.id, company.id, 'inactive'),
      `/${company.id}/companies`,
    );

    const [row] = await db.select().from(companies).where(eq(companies.id, company.id));
    expect(row.status).toBe('inactive');
  });

  it('the status must be a valid value', async () => {
    const { company } = await ownerContext();

    const result = await updateCompanyStatusAction(company.id, company.id, 'deleted');

    expect(result.fieldErrors?.status?.[0]).toBe('El estado no es válido.');
  });

  it('changing the status of a missing company returns an error', async () => {
    const { company } = await ownerContext();

    expect(await updateCompanyStatusAction(company.id, uuidv7(), 'inactive')).toMatchObject({
      status: 'error',
      message: 'Empresa no encontrada.',
    });
  });
});
