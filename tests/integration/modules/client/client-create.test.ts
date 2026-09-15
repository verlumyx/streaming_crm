import { beforeEach, describe, expect, it } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { clients } from '@/modules/client/models/client.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { createClientAction } from '@/app/[companyId]/clients/actions';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { createUserWithCompany, assignRoleWithPermissions, addMembership } from '../../../helpers/company-context';
import { createCompany } from '../../../factories/company.factory';
import { createClient } from '../../../factories/client.factory';
import { formData } from '../../../helpers/form-data';

async function create(companyId: string, values: Record<string, string>) {
  return createClientAction(companyId, initialActionState, formData({ id: uuidv7(), ...values }));
}

describe('Crear cliente', () => {
  beforeEach(resetDb);

  it('a client can be created', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const id = uuidv7();

    await expectRedirect(
      createClientAction(
        company.id,
        initialActionState,
        formData({ id, name: 'Camila Rojas', phone: '+58 4121234567', email: 'camila@example.com', notes: 'Referida' }),
      ),
      `/${company.id}/clients`,
    );

    const [row] = await db.select().from(clients).where(eq(clients.id, id));
    expect(row).toMatchObject({
      companyId: company.id,
      code: 'CLI000001',
      name: 'Camila Rojas',
      phone: '+58 4121234567',
      email: 'camila@example.com',
      notes: 'Referida',
      status: 'active',
      createdBy: user.id,
    });
  });

  it('the code auto-increments per company', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    await expectRedirect(create(company.id, { name: 'Uno' }), `/${company.id}/clients`);
    await expectRedirect(create(company.id, { name: 'Dos' }), `/${company.id}/clients`);

    const rows = await db.select().from(clients).orderBy(asc(clients.code));
    expect(rows.map((r) => r.code)).toEqual(['CLI000001', 'CLI000002']);
  });

  it('each company has its own code sequence', async () => {
    const { user, company } = await createUserWithCompany(db);
    const other = await createCompany(db, { createdBy: user.id });
    await addMembership(db, user.id, other.id, { roleId: (await createUserWithCompany(db)).role.id });
    await assignRoleWithPermissions(db, user.id, other.id, ['clients.create']);
    setSessionUser(user);

    await expectRedirect(create(company.id, { name: 'A' }), `/${company.id}/clients`);
    await expectRedirect(create(other.id, { name: 'B' }), `/${other.id}/clients`);

    const [a] = await db.select().from(clients).where(eq(clients.companyId, company.id));
    const [b] = await db.select().from(clients).where(eq(clients.companyId, other.id));
    expect(a.code).toBe('CLI000001');
    expect(b.code).toBe('CLI000001');
  });

  it('concurrent creates never duplicate a code', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    await Promise.allSettled(Array.from({ length: 5 }, (_, i) => create(company.id, { name: `Cliente ${i}` })));

    const codes = (await db.select({ code: clients.code }).from(clients)).map((r) => r.code).sort();
    expect(codes).toEqual(['CLI000001', 'CLI000002', 'CLI000003', 'CLI000004', 'CLI000005']);
  });

  it('a client can be created without optional fields', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);
    const id = uuidv7();

    await expectRedirect(
      createClientAction(company.id, initialActionState, formData({ id, name: 'Solo nombre', phone: '', email: '', notes: '' })),
      `/${company.id}/clients`,
    );

    const [row] = await db.select().from(clients).where(eq(clients.id, id));
    expect(row).toMatchObject({ phone: null, email: null, notes: null });
  });

  it('the name is required', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await create(company.id, { name: '' });

    expect(result.status).toBe('error');
    expect(result.fieldErrors?.name?.[0]).toBe('El nombre es obligatorio.');
    expect(await db.select().from(clients)).toHaveLength(0);
  });

  it('the email must be unique within the company', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createClient(db, { companyId: company.id, email: 'dup@example.com' });
    setSessionUser(user);

    const result = await create(company.id, { name: 'Otro', email: 'DUP@example.com' });

    expect(result.fieldErrors?.email?.[0]).toBe('Ya existe un cliente con este correo.');
  });

  it('the same email can exist in another company', async () => {
    const { user, company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    await createClient(db, { companyId: other.id, email: 'shared@example.com' });
    setSessionUser(user);

    await expectRedirect(create(company.id, { name: 'Otro', email: 'shared@example.com' }), `/${company.id}/clients`);
  });

  it('the email must be a valid address', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await create(company.id, { name: 'Otro', email: 'no-es-correo' });

    expect(result.fieldErrors?.email?.[0]).toBe('El correo no es válido.');
  });

  it('a user without permission cannot create a client', async () => {
    const { user, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, user.id, company.id, ['clients.list']);
    setSessionUser(user);

    const result = await create(company.id, { name: 'Bloqueado' });

    expect(result).toMatchObject({ status: 'error', message: 'No tienes permiso para acceder a esta sección.' });
    expect(await db.select().from(clients)).toHaveLength(0);
  });
});
