import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { clients } from '@/modules/client/models/client.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { updateClientAction, updateClientStatusAction } from '@/app/[companyId]/clients/actions';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { createClient } from '../../../factories/client.factory';
import { formData } from '../../../helpers/form-data';

describe('Actualizar cliente', () => {
  beforeEach(resetDb);

  it('a client can be updated', async () => {
    const { user, company } = await createUserWithCompany(db);
    const client = await createClient(db, { companyId: company.id });
    setSessionUser(user);

    await expectRedirect(
      updateClientAction(
        company.id,
        client.id,
        initialActionState,
        formData({ name: 'Nuevo Nombre', phone: '+58 999', email: 'nuevo@example.com', notes: 'Nota' }),
      ),
      `/${company.id}/clients/${client.id}`,
    );

    const [row] = await db.select().from(clients).where(eq(clients.id, client.id));
    expect(row).toMatchObject({ name: 'Nuevo Nombre', phone: '+58 999', email: 'nuevo@example.com', notes: 'Nota' });
    expect(row.code).toBe(client.code);
  });

  it('a client keeps its own email when updating', async () => {
    const { user, company } = await createUserWithCompany(db);
    const client = await createClient(db, { companyId: company.id, email: 'mio@example.com' });
    setSessionUser(user);

    await expectRedirect(
      updateClientAction(company.id, client.id, initialActionState, formData({ name: 'Igual', email: 'mio@example.com' })),
      `/${company.id}/clients/${client.id}`,
    );
  });

  it('a client cannot take another clients email', async () => {
    const { user, company } = await createUserWithCompany(db);
    await createClient(db, { companyId: company.id, email: 'tomado@example.com' });
    const client = await createClient(db, { companyId: company.id });
    setSessionUser(user);

    const result = await updateClientAction(
      company.id,
      client.id,
      initialActionState,
      formData({ name: 'X', email: 'tomado@example.com' }),
    );

    expect(result.fieldErrors?.email?.[0]).toBe('Ya existe un cliente con este correo.');
  });

  it('updating a missing client returns an error', async () => {
    const { user, company } = await createUserWithCompany(db);
    setSessionUser(user);

    const result = await updateClientAction(company.id, uuidv7(), initialActionState, formData({ name: 'X' }));

    expect(result).toMatchObject({ status: 'error', message: 'Cliente no encontrado.' });
  });

  it('a user without permission cannot update a client', async () => {
    const { user, company } = await createUserWithCompany(db);
    const client = await createClient(db, { companyId: company.id, name: 'Original' });
    await assignRoleWithPermissions(db, user.id, company.id, ['clients.show']);
    setSessionUser(user);

    const result = await updateClientAction(company.id, client.id, initialActionState, formData({ name: 'Hackeado' }));

    expect(result.status).toBe('error');
    const [row] = await db.select().from(clients).where(eq(clients.id, client.id));
    expect(row.name).toBe('Original');
  });
});

describe('Actualizar estado del cliente', () => {
  beforeEach(resetDb);

  it('a client status can be changed', async () => {
    const { user, company } = await createUserWithCompany(db);
    const client = await createClient(db, { companyId: company.id, status: 'active' });
    setSessionUser(user);

    await expectRedirect(updateClientStatusAction(company.id, client.id, 'inactive'), `/${company.id}/clients`);
    let [row] = await db.select().from(clients).where(eq(clients.id, client.id));
    expect(row.status).toBe('inactive');

    await expectRedirect(
      updateClientStatusAction(company.id, client.id, 'active', 'show'),
      `/${company.id}/clients/${client.id}`,
    );
    [row] = await db.select().from(clients).where(eq(clients.id, client.id));
    expect(row.status).toBe('active');
  });

  it('the status must be a valid value', async () => {
    const { user, company } = await createUserWithCompany(db);
    const client = await createClient(db, { companyId: company.id });
    setSessionUser(user);

    const result = await updateClientStatusAction(company.id, client.id, 'deleted');

    expect(result.fieldErrors?.status?.[0]).toBe('El estado no es válido.');
  });

  it('a user without permission cannot change client status', async () => {
    const { user, company } = await createUserWithCompany(db);
    const client = await createClient(db, { companyId: company.id, status: 'active' });
    await assignRoleWithPermissions(db, user.id, company.id, ['clients.update']);
    setSessionUser(user);

    const result = await updateClientStatusAction(company.id, client.id, 'inactive');

    expect(result.status).toBe('error');
    const [row] = await db.select().from(clients).where(eq(clients.id, client.id));
    expect(row.status).toBe('active');
  });
});
