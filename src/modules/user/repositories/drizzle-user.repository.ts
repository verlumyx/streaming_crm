import { and, count, desc, eq, ne, sql } from 'drizzle-orm';
import { account, user } from '@/db/auth-schema';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { applyFilters } from '@/modules/shared/infrastructure/drizzle-query-filters';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import { companies } from '@/modules/company/models/company.model';
import { roles } from '@/modules/role/models/role.model';
import { uuidv7 } from '@/modules/shared/uuid';
import { UserNotFoundException } from '../exceptions/user-not-found.exception';
import { userFilters } from './user.filters';
import type { UserIdentity, UserRepository, UserWithMembership } from './user.repository';
import type { CreateUserCommand } from '../commands/create-user.command';
import type { SearchUserCommand } from '../commands/search-user.command';
import type { UpdateUserCommand } from '../commands/update-user.command';

/** better-auth provider id of email + password accounts. */
const CREDENTIAL_PROVIDER = 'credential';

const withMembershipColumns = {
  id: user.id,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  companyId: userCompanies.companyId,
  companyName: companies.name,
  membershipStatus: userCompanies.status,
  roleId: roles.id,
  roleName: roles.name,
};

type WithMembershipRecord = Omit<UserWithMembership, 'role'> & { roleId: string | null; roleName: string | null };

function toUserWithMembership({ roleId, roleName, ...rest }: WithMembershipRecord): UserWithMembership {
  return { ...rest, role: roleId && roleName ? { id: roleId, name: roleName } : null };
}

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: DbExecutor) {}

  async create(command: CreateUserCommand): Promise<void> {
    await this.db.insert(user).values({
      id: command.id,
      name: command.name ?? '',
      email: command.email,
      emailVerified: false,
    });
  }

  async setCredentialPassword(userId: string, passwordHash: string): Promise<void> {
    const [existing] = await this.db
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, CREDENTIAL_PROVIDER)))
      .limit(1);

    if (existing) {
      await this.db.update(account).set({ password: passwordHash }).where(eq(account.id, existing.id));
      return;
    }

    await this.db.insert(account).values({
      id: uuidv7(),
      accountId: userId,
      providerId: CREDENTIAL_PROVIDER,
      userId,
      password: passwordHash,
    });
  }

  async findById(id: string, companyId: string): Promise<UserWithMembership | null> {
    const [row] = await this.membershipQuery(companyId).where(eq(user.id, id)).limit(1);
    return row ? toUserWithMembership(row) : null;
  }

  async findOrFail(id: string, companyId: string): Promise<UserWithMembership> {
    const row = await this.findById(id, companyId);
    if (!row) throw new UserNotFoundException();
    return row;
  }

  async update(row: UserWithMembership, command: UpdateUserCommand): Promise<void> {
    await this.db.update(user).set({ name: command.name, email: command.email }).where(eq(user.id, row.id));
  }

  async search(command: SearchUserCommand): Promise<{ data: UserWithMembership[]; total: number }> {
    const where = and(...applyFilters(userFilters, command.filters));

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(user)
      .innerJoin(
        userCompanies,
        and(eq(userCompanies.userId, user.id), eq(userCompanies.companyId, command.companyId)),
      )
      .where(where);

    const rows = await this.membershipQuery(command.companyId)
      .where(where)
      .orderBy(desc(user.createdAt), desc(user.id))
      .limit(command.limit)
      .offset(command.offset);

    return { data: rows.map(toUserWithMembership), total };
  }

  async findIdentityById(id: string): Promise<UserIdentity | null> {
    const [row] = await this.db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    return row ?? null;
  }

  async findIdentityByEmail(email: string): Promise<UserIdentity | null> {
    const [row] = await this.db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(sql`lower(${user.email}) = lower(${email})`)
      .limit(1);
    return row ?? null;
  }

  async existsByEmail(email: string, ignoreId?: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: user.id })
      .from(user)
      .where(and(sql`lower(${user.email}) = lower(${email})`, ignoreId ? ne(user.id, ignoreId) : undefined))
      .limit(1);
    return Boolean(row);
  }

  async roleBelongsToCompany(roleId: string, companyId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.id, roleId), eq(roles.companyId, companyId)))
      .limit(1);
    return Boolean(row);
  }

  /** Users joined to their membership in `companyId` (inner join = only members), its company and role. */
  private membershipQuery(companyId: string) {
    return this.db
      .select(withMembershipColumns)
      .from(user)
      .innerJoin(userCompanies, and(eq(userCompanies.userId, user.id), eq(userCompanies.companyId, companyId)))
      .innerJoin(companies, eq(companies.id, userCompanies.companyId))
      .leftJoin(roles, eq(roles.id, userCompanies.roleId))
      .$dynamic();
  }
}
