import { beforeEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { account, user as users } from '@/db/auth-schema';
import { auth } from '@/lib/auth';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import { initialActionState } from '@/modules/shared/actions/action-state';
import { uuidv7 } from '@/modules/shared/uuid';
import { checkUserEmailAction, createUserAction } from '@/app/[companyId]/users/actions';
import UserCreatePage from '@/app/[companyId]/users/create/page';
import { resetDb } from '../../../helpers/reset-db';
import { setSessionUser, expectRedirect } from '../../../helpers/session-mock';
import { addMembership, assignRoleWithPermissions, createUserWithCompany } from '../../../helpers/company-context';
import { formData } from '../../../helpers/form-data';
import { createCompany } from '../../../factories/company.factory';
import { createUser } from '../../../factories/user.factory';
import { createRole } from '../../../factories/role.factory';

function payload(overrides: Record<string, string> = {}) {
  return {
    id: uuidv7(),
    name: 'John Doe',
    email: `john_${uuidv7().slice(-8)}@example.com`,
    password: 'password123',
    passwordConfirmation: 'password123',
    ...overrides,
  };
}

const create = (companyId: string, values: Record<string, string>) =>
  createUserAction(companyId, initialActionState, formData(values));

describe('Crear usuario', () => {
  beforeEach(resetDb);

  it('a user is created with a credential account and an active membership', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const role = await createRole(db, { companyId: company.id, name: 'Vendedor' });
    setSessionUser(actor);
    const values = payload({ email: 'New.User@Example.com', roleId: role.id });

    await expectRedirect(create(company.id, values), `/${company.id}/users`);

    const [created] = await db.select().from(users).where(eq(users.id, values.id));
    expect(created).toMatchObject({ name: 'John Doe', email: 'new.user@example.com', emailVerified: false });

    const [credential] = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, values.id), eq(account.providerId, 'credential')));
    expect(credential.accountId).toBe(values.id);
    const ctx = await auth.$context;
    expect(await ctx.password.verify({ hash: credential.password!, password: 'password123' })).toBe(true);

    const [membership] = await db.select().from(userCompanies).where(eq(userCompanies.userId, values.id));
    expect(membership).toMatchObject({ companyId: company.id, roleId: role.id, status: 'active', isDefault: false });
  });

  it('creation fails when the password confirmation does not match', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    setSessionUser(actor);
    const values = payload({ passwordConfirmation: 'different-password' });

    const result = await create(company.id, values);

    expect(result.fieldErrors?.password?.[0]).toBe('La confirmación de la contraseña no coincide.');
    expect(await db.select().from(users).where(eq(users.email, values.email))).toHaveLength(0);
  });

  it('name, email and a password of at least 8 characters are required for new users', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    setSessionUser(actor);

    const missing = await create(company.id, { id: uuidv7(), email: '', name: '', password: '', passwordConfirmation: '' });
    const short = await create(company.id, payload({ password: 'short', passwordConfirmation: 'short' }));
    const invalidEmail = await create(company.id, payload({ email: 'no-es-email' }));

    expect(missing.fieldErrors?.email?.[0]).toBe('El email es obligatorio.');
    expect(missing.fieldErrors?.name?.[0]).toBe('El nombre es obligatorio.');
    expect(missing.fieldErrors?.password?.[0]).toBe('La contraseña es obligatoria.');
    expect(short.fieldErrors?.password?.[0]).toBe('La contraseña debe tener al menos 8 caracteres.');
    expect(invalidEmail.fieldErrors?.email?.[0]).toBe('El email no es válido.');
  });

  it('the email of a new user must be globally unique (case-insensitive)', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    await createUser(db, { email: 'taken@example.com' });
    setSessionUser(actor);

    const result = await create(company.id, payload({ email: 'TAKEN@example.com' }));

    expect(result.fieldErrors?.email?.[0]).toBe('Ya existe un usuario con este email.');
  });

  it('an existing user only gets a membership in the company', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const other = await createCompany(db);
    const existing = await createUser(db, { name: 'Existing', email: 'existing@example.com' });
    await addMembership(db, existing.id, other.id, { isDefault: true });
    setSessionUser(actor);

    await expectRedirect(
      create(company.id, {
        id: uuidv7(),
        existingUserId: existing.id,
        email: 'existing@example.com',
        name: 'Ignored',
        password: '',
        passwordConfirmation: '',
      }),
      `/${company.id}/users`,
    );

    const memberships = await db.select().from(userCompanies).where(eq(userCompanies.userId, existing.id));
    expect(memberships).toHaveLength(2);
    expect(memberships.find((m) => m.companyId === company.id)).toMatchObject({ status: 'active', isDefault: false });
    const [row] = await db.select().from(users).where(eq(users.id, existing.id));
    expect(row.name).toBe('Existing');
    expect(await db.select().from(account).where(eq(account.userId, existing.id))).toHaveLength(0);
  });

  it('an existing user already in the company cannot be added twice', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    setSessionUser(actor);

    const result = await create(company.id, { id: uuidv7(), existingUserId: actor.id, email: actor.email });

    expect(result.fieldErrors?.email?.[0]).toBe('Este usuario ya tiene acceso a esta empresa.');
  });

  it('the existing user must match the verified email', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const existing = await createUser(db, { email: 'someone@example.com' });
    setSessionUser(actor);

    const result = await create(company.id, { id: uuidv7(), existingUserId: existing.id, email: 'other@example.com' });

    expect(result.fieldErrors?.email?.[0]).toBe('El usuario existente no es válido. Vuelve a verificar el email.');
    expect(await db.select().from(userCompanies).where(eq(userCompanies.userId, existing.id))).toHaveLength(0);
  });

  it('the role must belong to the same company', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const foreignRole = await createRole(db, { companyId: (await createCompany(db)).id });
    setSessionUser(actor);
    const values = payload({ roleId: foreignRole.id });

    const result = await create(company.id, values);

    expect(result.fieldErrors?.roleId?.[0]).toBe('El rol seleccionado no es válido.');
    expect(await db.select().from(users).where(eq(users.id, values.id))).toHaveLength(0);
  });

  it('the create page offers only the active roles of the company', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    await createRole(db, { companyId: company.id, name: 'Activo' });
    await createRole(db, { companyId: company.id, name: 'Inactivo', status: 'inactive' });
    await createRole(db, { companyId: (await createCompany(db)).id, name: 'Ajeno' });
    setSessionUser(actor);

    const element = await UserCreatePage({ params: Promise.resolve({ companyId: company.id }) });

    expect(element.props.children.props.roles.map((r: { name: string }) => r.name)).toEqual(['Activo', 'Administrador']);
  });

  it('a user without users.create cannot open the create view nor store a user', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    await assignRoleWithPermissions(db, actor.id, company.id, ['users.list']);
    setSessionUser(actor);

    await expectRedirect(
      UserCreatePage({ params: Promise.resolve({ companyId: company.id }) }),
      `/${company.id}/dashboard?error=forbidden`,
    );
    const result = await create(company.id, payload({ name: 'Blocked User' }));

    expect(result).toMatchObject({ status: 'error', message: 'No tienes permiso para acceder a esta sección.' });
    expect(await db.select().from(users).where(eq(users.name, 'Blocked User'))).toHaveLength(0);
  });
});

describe('Verificar email (paso 1)', () => {
  beforeEach(resetDb);

  it('reports an unknown email', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    setSessionUser(actor);

    expect(await checkUserEmailAction(company.id, 'nobody@example.com')).toEqual({
      status: 'ok',
      exists: false,
      alreadyInCompany: false,
      user: null,
    });
  });

  it('reports an existing user from another company (case-insensitive)', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    const existing = await createUser(db, { name: 'Existing', email: 'existing@example.com' });
    await addMembership(db, existing.id, (await createCompany(db)).id);
    setSessionUser(actor);

    expect(await checkUserEmailAction(company.id, ' Existing@Example.com ')).toEqual({
      status: 'ok',
      exists: true,
      alreadyInCompany: false,
      user: { id: existing.id, name: 'Existing' },
    });
  });

  it('reports a user already in the company', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    setSessionUser(actor);

    expect(await checkUserEmailAction(company.id, actor.email)).toMatchObject({ status: 'ok', exists: true, alreadyInCompany: true });
  });

  it('validates the email and requires users.create', async () => {
    const { user: actor, company } = await createUserWithCompany(db);
    setSessionUser(actor);
    const invalid = await checkUserEmailAction(company.id, 'nope');

    await assignRoleWithPermissions(db, actor.id, company.id, ['users.list']);
    const forbidden = await checkUserEmailAction(company.id, 'someone@example.com');

    expect(invalid).toMatchObject({ status: 'error', fieldErrors: { email: ['El email no es válido.'] } });
    expect(forbidden).toMatchObject({ status: 'error', message: 'No tienes permiso para acceder a esta sección.' });
  });
});
