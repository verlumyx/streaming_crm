import type { UserCompanyRow } from '@/modules/shared/models/user-company.model';
import type { UserIdentity, UserRepository, UserWithMembership } from '@/modules/user/repositories/user.repository';
import type { UserCompanyRepository } from '@/modules/user/repositories/user-company.repository';
import type { PasswordHasher } from '@/modules/user/services/password-hasher';
import type { CreateUserCommand } from '@/modules/user/commands/create-user.command';
import type { CreateUserCompanyCommand } from '@/modules/user/commands/create-user-company.command';
import type { SearchUserCommand } from '@/modules/user/commands/search-user.command';
import type { UpdateStatusUserCommand } from '@/modules/user/commands/update-status-user.command';
import type { UpdateUserCommand } from '@/modules/user/commands/update-user.command';
import { UserNotFoundException } from '@/modules/user/exceptions/user-not-found.exception';

type StoredUser = UserIdentity & { emailVerified: boolean; createdAt: Date; updatedAt: Date | null };

/** Deterministic hasher: never touches better-auth. */
export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string) {
    return `hashed:${plain}`;
  }
}

/** In-memory memberships. */
export class FakeUserCompanyRepository implements UserCompanyRepository {
  rows: UserCompanyRow[] = [];

  async create(command: CreateUserCompanyCommand) {
    this.rows.push({
      id: command.id,
      userId: command.userId,
      companyId: command.companyId,
      roleId: command.roleId,
      status: command.status,
      isDefault: command.isDefault,
      createdAt: new Date(),
      updatedAt: null,
    });
  }

  async find(userId: string, companyId: string) {
    return this.rows.find((r) => r.userId === userId && r.companyId === companyId) ?? null;
  }

  async updateRole(userId: string, companyId: string, roleId: string | null) {
    const row = await this.find(userId, companyId);
    if (row) row.roleId = roleId;
    else await this.create({ id: `m-${this.rows.length}`, userId, companyId, roleId, status: 'active', isDefault: false });
  }

  async updateStatus(row: UserCompanyRow, command: UpdateStatusUserCommand) {
    row.status = command.status;
  }
}

/** In-memory users + credential passwords; company-scoped reads go through the membership fake. */
export class FakeUserRepository implements UserRepository {
  users: StoredUser[] = [];
  passwords = new Map<string, string>();
  /** roleId → companyId */
  roles = new Map<string, string>();

  constructor(private readonly memberships: FakeUserCompanyRepository) {}

  seedUser(user: Partial<StoredUser> & { id: string; email: string }): StoredUser {
    const full: StoredUser = { name: 'Usuario', emailVerified: true, createdAt: new Date(), updatedAt: null, ...user };
    this.users.push(full);
    return full;
  }

  async create(command: CreateUserCommand) {
    this.seedUser({ id: command.id, name: command.name ?? '', email: command.email, emailVerified: false });
  }

  async setCredentialPassword(userId: string, passwordHash: string) {
    this.passwords.set(userId, passwordHash);
  }

  async findById(id: string, companyId: string): Promise<UserWithMembership | null> {
    const user = this.users.find((u) => u.id === id);
    const membership = await this.memberships.find(id, companyId);
    if (!user || !membership) return null;
    return {
      ...user,
      companyId,
      companyName: 'Empresa',
      membershipStatus: membership.status,
      role: membership.roleId ? { id: membership.roleId, name: 'Rol' } : null,
    };
  }

  async findOrFail(id: string, companyId: string) {
    const row = await this.findById(id, companyId);
    if (!row) throw new UserNotFoundException();
    return row;
  }

  async update(row: UserWithMembership, command: UpdateUserCommand) {
    Object.assign(this.users.find((u) => u.id === row.id)!, { name: command.name, email: command.email });
  }

  async search(command: SearchUserCommand) {
    const rows = await Promise.all(this.users.map((u) => this.findById(u.id, command.companyId)));
    const data = rows.filter((r): r is UserWithMembership => r !== null);
    return { data, total: data.length };
  }

  async findIdentityById(id: string) {
    const user = this.users.find((u) => u.id === id);
    return user ? { id: user.id, name: user.name, email: user.email } : null;
  }

  async findIdentityByEmail(email: string) {
    const user = this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user ? { id: user.id, name: user.name, email: user.email } : null;
  }

  async existsByEmail(email: string, ignoreId?: string) {
    return this.users.some((u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== ignoreId);
  }

  async roleBelongsToCompany(roleId: string, companyId: string) {
    return this.roles.get(roleId) === companyId;
  }
}
