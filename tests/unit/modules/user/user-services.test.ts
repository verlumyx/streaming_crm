import { describe, expect, it } from 'vitest';
import { UserCreateService } from '@/modules/user/services/user-create.service';
import { UserUpdateService } from '@/modules/user/services/user-update.service';
import { UserUpdateStatusService } from '@/modules/user/services/user-update-status.service';
import { UserCheckEmailService } from '@/modules/user/services/user-check-email.service';
import { UserFindService } from '@/modules/user/services/user-find.service';
import { CreateUserCommand } from '@/modules/user/commands/create-user.command';
import { UpdateUserCommand } from '@/modules/user/commands/update-user.command';
import { UpdateStatusUserCommand } from '@/modules/user/commands/update-status-user.command';
import { UserEmailAlreadyExistsException } from '@/modules/user/exceptions/user-email-already-exists.exception';
import { UserAlreadyInCompanyException } from '@/modules/user/exceptions/user-already-in-company.exception';
import { ExistingUserNotFoundException } from '@/modules/user/exceptions/existing-user-not-found.exception';
import { UserRoleInvalidException } from '@/modules/user/exceptions/user-role-invalid.exception';
import { UserNotFoundException } from '@/modules/user/exceptions/user-not-found.exception';
import { createUserSchema } from '@/modules/user/validation/create-user.schema';
import { updateUserSchema } from '@/modules/user/validation/update-user.schema';
import { FakePasswordHasher, FakeUserCompanyRepository, FakeUserRepository } from './fake-user.repositories';

const COMPANY = '0192f3a0-0000-7000-8000-00000000c001';
const OTHER_COMPANY = '0192f3a0-0000-7000-8000-00000000c002';
const USER_1 = '0192f3a0-0000-7000-8000-000000000001';
const USER_2 = '0192f3a0-0000-7000-8000-000000000002';
const ROLE = '0192f3a0-0000-7000-8000-0000000000a1';

function setup() {
  const memberships = new FakeUserCompanyRepository();
  const users = new FakeUserRepository(memberships);
  const hasher = new FakePasswordHasher();
  users.roles.set(ROLE, COMPANY);
  return { memberships, users, hasher };
}

type NewUserOverrides = Partial<
  Pick<CreateUserCommand, 'email' | 'name' | 'password' | 'roleId' | 'existingUserId'>
>;

const newUser = (overrides: NewUserOverrides = {}) => {
  const values = { email: 'new@example.com', name: 'Nuevo', password: 'password123', roleId: null, existingUserId: null, ...overrides };
  return new CreateUserCommand(USER_1, COMPANY, values.email, values.name, values.password, values.roleId, values.existingUserId);
};

describe('UserCreateService', () => {
  it('creates the user, hashes the password and adds an active non-default membership', async () => {
    const { users, memberships, hasher } = setup();

    const created = await new UserCreateService(users, memberships, hasher).execute(newUser({ roleId: ROLE }));

    expect(created).toMatchObject({ id: USER_1, emailVerified: false, membershipStatus: 'active', role: { id: ROLE } });
    expect(users.passwords.get(USER_1)).toBe('hashed:password123');
    expect(memberships.rows[0]).toMatchObject({ companyId: COMPANY, status: 'active', isDefault: false });
  });

  it('rejects an email already used by any user', async () => {
    const { users, memberships, hasher } = setup();
    users.seedUser({ id: USER_2, email: 'NEW@example.com' });

    await expect(new UserCreateService(users, memberships, hasher).execute(newUser())).rejects.toBeInstanceOf(
      UserEmailAlreadyExistsException,
    );
    expect(memberships.rows).toHaveLength(0);
  });

  it('only adds a membership for an existing user', async () => {
    const { users, memberships, hasher } = setup();
    users.seedUser({ id: USER_2, email: 'existing@example.com', name: 'Existente' });
    await memberships.create({ id: 'm0', userId: USER_2, companyId: OTHER_COMPANY, roleId: null, status: 'active', isDefault: true });

    const created = await new UserCreateService(users, memberships, hasher).execute(
      newUser({ email: 'existing@example.com', name: null, password: null, existingUserId: USER_2 }),
    );

    expect(created).toMatchObject({ id: USER_2, name: 'Existente' });
    expect(users.users).toHaveLength(1);
    expect(users.passwords.size).toBe(0);
    expect(memberships.rows.map((m) => m.companyId)).toEqual([OTHER_COMPANY, COMPANY]);
  });

  it('rejects an existing user already in the company or not matching the email', async () => {
    const { users, memberships, hasher } = setup();
    users.seedUser({ id: USER_2, email: 'existing@example.com' });
    const service = new UserCreateService(users, memberships, hasher);

    await expect(service.execute(newUser({ email: 'other@example.com', existingUserId: USER_2 }))).rejects.toBeInstanceOf(
      ExistingUserNotFoundException,
    );
    await memberships.create({ id: 'm0', userId: USER_2, companyId: COMPANY, roleId: null, status: 'active', isDefault: false });
    await expect(service.execute(newUser({ email: 'existing@example.com', existingUserId: USER_2 }))).rejects.toBeInstanceOf(
      UserAlreadyInCompanyException,
    );
  });

  it('rejects a role of another company', async () => {
    const { users, memberships, hasher } = setup();
    users.roles.set(ROLE, OTHER_COMPANY);

    await expect(new UserCreateService(users, memberships, hasher).execute(newUser({ roleId: ROLE }))).rejects.toBeInstanceOf(
      UserRoleInvalidException,
    );
    expect(users.users).toHaveLength(0);
  });
});

describe('UserUpdateService', () => {
  it('updates data, re-hashes a new password and sets the role in this company', async () => {
    const { users, memberships, hasher } = setup();
    users.seedUser({ id: USER_1, email: 'a@example.com' });
    await memberships.create({ id: 'm0', userId: USER_1, companyId: COMPANY, roleId: null, status: 'active', isDefault: true });

    const updated = await new UserUpdateService(users, memberships, hasher).execute(
      USER_1,
      COMPANY,
      new UpdateUserCommand('Renombrado', 'a@example.com', 'new-password', ROLE),
    );

    expect(updated).toMatchObject({ name: 'Renombrado', role: { id: ROLE } });
    expect(users.passwords.get(USER_1)).toBe('hashed:new-password');
  });

  it('keeps the password when none is given and rejects a taken email', async () => {
    const { users, memberships, hasher } = setup();
    users.seedUser({ id: USER_1, email: 'a@example.com' });
    users.seedUser({ id: USER_2, email: 'b@example.com' });
    await memberships.create({ id: 'm0', userId: USER_1, companyId: COMPANY, roleId: null, status: 'active', isDefault: true });
    const service = new UserUpdateService(users, memberships, hasher);

    await service.execute(USER_1, COMPANY, new UpdateUserCommand('A', 'A@example.com', null, null));
    expect(users.passwords.size).toBe(0);
    await expect(service.execute(USER_1, COMPANY, new UpdateUserCommand('A', 'b@example.com', null, null))).rejects.toBeInstanceOf(
      UserEmailAlreadyExistsException,
    );
  });

  it('only updates users that belong to the company', async () => {
    const { users, memberships, hasher } = setup();
    users.seedUser({ id: USER_1, email: 'a@example.com' });

    await expect(
      new UserUpdateService(users, memberships, hasher).execute(USER_1, COMPANY, new UpdateUserCommand('A', 'a@example.com', null, null)),
    ).rejects.toBeInstanceOf(UserNotFoundException);
    await expect(new UserFindService(users).execute(USER_1, COMPANY)).rejects.toBeInstanceOf(UserNotFoundException);
  });
});

describe('UserUpdateStatusService / UserCheckEmailService', () => {
  it('changes the membership of this company only', async () => {
    const { memberships } = setup();
    await memberships.create({ id: 'm0', userId: USER_1, companyId: COMPANY, roleId: null, status: 'active', isDefault: true });
    await memberships.create({ id: 'm1', userId: USER_1, companyId: OTHER_COMPANY, roleId: null, status: 'active', isDefault: false });

    await new UserUpdateStatusService(memberships).execute(USER_1, COMPANY, new UpdateStatusUserCommand('inactive'));

    expect(memberships.rows.map((m) => m.status)).toEqual(['inactive', 'active']);
    await expect(
      new UserUpdateStatusService(memberships).execute(USER_2, COMPANY, new UpdateStatusUserCommand('inactive')),
    ).rejects.toBeInstanceOf(UserNotFoundException);
  });

  it('reports existence and membership of an email', async () => {
    const { users, memberships } = setup();
    users.seedUser({ id: USER_1, email: 'a@example.com', name: 'Ana' });
    const service = new UserCheckEmailService(users, memberships);

    expect(await service.execute('none@example.com', COMPANY)).toEqual({ exists: false, alreadyInCompany: false, user: null });
    expect(await service.execute('A@example.com', COMPANY)).toEqual({
      exists: true,
      alreadyInCompany: false,
      user: { id: USER_1, name: 'Ana' },
    });
    await memberships.create({ id: 'm0', userId: USER_1, companyId: COMPANY, roleId: null, status: 'active', isDefault: true });
    expect(await service.execute('a@example.com', COMPANY)).toMatchObject({ alreadyInCompany: true });
  });
});

describe('user schemas', () => {
  it('ignores name and password for an existing user', () => {
    const parsed = createUserSchema.parse({
      id: USER_1,
      existingUserId: USER_2,
      email: ' Someone@Example.com ',
      name: '',
      password: 'x',
    });

    expect(parsed).toMatchObject({ email: 'someone@example.com', name: null, password: null, roleId: null });
  });

  it('requires a confirmed password of at least 8 characters for new users only when given on update', () => {
    expect(createUserSchema.safeParse({ id: USER_1, email: 'a@example.com', name: 'A' }).success).toBe(false);
    expect(updateUserSchema.safeParse({ name: 'A', email: 'a@example.com', password: '' }).success).toBe(true);
    expect(
      updateUserSchema.safeParse({ name: 'A', email: 'a@example.com', password: 'password1', passwordConfirmation: 'password2' })
        .success,
    ).toBe(false);
  });
});
