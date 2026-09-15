import { beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { account, user as users } from '@/db/auth-schema';
import { auth } from '@/lib/auth';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { updateUserAction, updateUserStatusAction } from '@/app/[companyId]/users/actions';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { addMembership, assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { formData } from '../../../helpers/form-data';
import { createCompany } from '../../../factories/company.factory';
import { createUser } from '../../../factories/user.factory';
import { createRole } from '../../../factories/role.factory';

const update = (companyId: string, id: string, values: Record<string, string>) =>
  updateUserAction(companyId, id, initialActionState, formData(values));

async function membership(userId: string, companyId: string) {
  const [row] = await db
    .select()
    .from(userCompanies)
    .where(and(eq(userCompanies.userId, userId), eq(userCompanies.companyId, companyId)));
  return row;
}

async function credentialHash(userId: string) {
  const [row] = await db
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
  return row?.password ?? null;
}

describe('Actualizar usuario', () => {
  beforeEach(resetDb);

  it('name, email and the role in this company can be updated', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const role = await createRole(db, { companyId: company.id, name: 'Soporte' });
    const target = await createUser(db, { name: 'Old', email: 'old@example.com' });
    await addMembership(db, target.id, company.id);
    setSessionUser(actor);

    await expectRedirect(
      update(company.id, target.id, { name: 'New Name', email: 'New@Example.com', roleId: role.id }),
      `/${company.id}/users/${target.id}`,
    );

    const [row] = await db.select().from(users).where(eq(users.id, target.id));
    expect(row).toMatchObject({ name: 'New Name', email: 'new@example.com' });
    expect((await membership(target.id, company.id)).roleId).toBe(role.id);
    expect(await credentialHash(target.id)).toBeNull();
  });

  it('an empty role removes the role only in this company', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    const role = await createRole(db, { companyId: company.id });
    const otherRole = await createRole(db, { companyId: other.id });
    const target = await createUser(db);
    await addMembership(db, target.id, company.id, { roleId: role.id });
    await addMembership(db, target.id, other.id, { roleId: otherRole.id });
    setSessionUser(actor);

    await expectRedirect(
      update(company.id, target.id, { name: target.name, email: target.email, roleId: '' }),
      `/${company.id}/users/${target.id}`,
    );

    expect((await membership(target.id, company.id)).roleId).toBeNull();
    expect((await membership(target.id, other.id)).roleId).toBe(otherRole.id);
  });

  it('a new password is hashed into the credential account', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const target = await createUser(db);
    await addMembership(db, target.id, company.id);
    setSessionUser(actor);

    await expectRedirect(
      update(company.id, target.id, {
        name: target.name,
        email: target.email,
        password: 'brand-new-pass',
        passwordConfirmation: 'brand-new-pass',
      }),
      `/${company.id}/users/${target.id}`,
    );
    const first = await credentialHash(target.id);

    await expectRedirect(
      update(company.id, target.id, {
        name: target.name,
        email: target.email,
        password: 'another-pass-1',
        passwordConfirmation: 'another-pass-1',
      }),
      `/${company.id}/users/${target.id}`,
    );
    const second = await credentialHash(target.id);

    const ctx = await auth.$context;
    expect(await ctx.password.verify({ hash: first!, password: 'brand-new-pass' })).toBe(true);
    expect(await ctx.password.verify({ hash: second!, password: 'another-pass-1' })).toBe(true);
    expect(await db.select().from(account).where(eq(account.userId, target.id))).toHaveLength(1);
  });

  it('the optional password still has to be confirmed and long enough', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    setSessionUser(actor);

    const mismatch = await update(company.id, actor.id, {
      name: actor.name,
      email: actor.email,
      password: 'password123',
      passwordConfirmation: 'password124',
    });
    const short = await update(company.id, actor.id, {
      name: actor.name,
      email: actor.email,
      password: 'short',
      passwordConfirmation: 'short',
    });

    expect(mismatch.fieldErrors?.password?.[0]).toBe('La confirmación de la contraseña no coincide.');
    expect(short.fieldErrors?.password?.[0]).toBe('La contraseña debe tener al menos 8 caracteres.');
  });

  it('the email is unique ignoring the user itself', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    await createUser(db, { email: 'taken@example.com' });
    const target = await createUser(db, { email: 'mine@example.com' });
    await addMembership(db, target.id, company.id);
    setSessionUser(actor);

    await expectRedirect(
      update(company.id, target.id, { name: 'Same', email: 'MINE@example.com' }),
      `/${company.id}/users/${target.id}`,
    );
    const result = await update(company.id, target.id, { name: 'Same', email: 'taken@example.com' });

    expect(result.fieldErrors?.email?.[0]).toBe('Ya existe un usuario con este email.');
  });

  it('the role must belong to the same company', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const foreignRole = await createRole(db, { companyId: (await createCompany(db)).id });
    setSessionUser(actor);

    const result = await update(company.id, actor.id, { name: actor.name, email: actor.email, roleId: foreignRole.id });

    expect(result.fieldErrors?.roleId?.[0]).toBe('El rol seleccionado no es válido.');
  });

  it('updating a missing user or a user of another company returns an error', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const outsider = await createUser(db, { name: 'Outsider' });
    await addMembership(db, outsider.id, (await createCompany(db)).id);
    setSessionUser(actor);

    expect(await update(company.id, uuidv7(), { name: 'X', email: 'x@example.com' })).toMatchObject({
      status: 'error',
      message: 'Usuario no encontrado.',
    });
    expect(await update(company.id, outsider.id, { name: 'X', email: 'x@example.com' })).toMatchObject({
      message: 'Usuario no encontrado.',
    });
    const [row] = await db.select().from(users).where(eq(users.id, outsider.id));
    expect(row.name).toBe('Outsider');
  });

  it('a user without users.update cannot update a user', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, actor.id, company.id, ['users.list']);
    const target = await createUser(db, { name: 'Original' });
    await addMembership(db, target.id, company.id);
    setSessionUser(actor);

    const result = await update(company.id, target.id, { name: 'Renamed', email: target.email });

    expect(result.status).toBe('error');
    const [row] = await db.select().from(users).where(eq(users.id, target.id));
    expect(row.name).toBe('Original');
  });
});

describe('Actualizar estado del usuario', () => {
  beforeEach(resetDb);

  it('the membership status changes only in this company', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    const target = await createUser(db);
    await addMembership(db, target.id, company.id);
    await addMembership(db, target.id, other.id);
    setSessionUser(actor);

    await expectRedirect(updateUserStatusAction(company.id, target.id, 'inactive'), `/${company.id}/users`);

    expect((await membership(target.id, company.id)).status).toBe('inactive');
    expect((await membership(target.id, other.id)).status).toBe('active');

    await expectRedirect(
      updateUserStatusAction(company.id, target.id, 'active', 'show'),
      `/${company.id}/users/${target.id}`,
    );
    expect((await membership(target.id, company.id)).status).toBe('active');
  });

  it('the status must be valid and the user must belong to the company', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const outsider = await createUser(db);
    await addMembership(db, outsider.id, (await createCompany(db)).id);
    setSessionUser(actor);

    expect((await updateUserStatusAction(company.id, actor.id, 'deleted')).fieldErrors?.status?.[0]).toBe(
      'El estado no es válido.',
    );
    expect(await updateUserStatusAction(company.id, outsider.id, 'inactive')).toMatchObject({
      message: 'Usuario no encontrado.',
    });
  });

  it('a user without users.update-status cannot change a user status', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, actor.id, company.id, ['users.list']);
    const target = await createUser(db);
    await addMembership(db, target.id, company.id);
    setSessionUser(actor);

    const result = await updateUserStatusAction(company.id, target.id, 'inactive');

    expect(result.status).toBe('error');
    expect((await membership(target.id, company.id)).status).toBe('active');
  });
});
