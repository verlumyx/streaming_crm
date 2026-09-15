import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { roles, rolePermissions, type RoleRow, ADMINISTRATOR_ROLE_NAME } from '@/modules/role/models/role.model';
import { userCompanies } from '@/modules/shared/models/user-company.model';
import type { CompanyRow } from '@/modules/company/models/company.model';
import type { UserRow } from '@/db/auth-schema';
import { uuidv7 } from '@/modules/shared/uuid';
import { createCompany } from '../factories/company.factory';
import { createUser } from '../factories/user.factory';
import { eq, and } from 'drizzle-orm';

export type UserWithCompany = { user: UserRow; company: CompanyRow; role: RoleRow };

/**
 * Equivalent of the original `createUserWithCompany()` test helper:
 * user + company + `Administrador` role (`permissionType = 'all'`) + active default membership.
 */
export async function createUserWithCompany(
  db: DbExecutor,
  opts: { isSystemOwner?: boolean; companyStatus?: 'active' | 'inactive' } = {},
): Promise<UserWithCompany> {
  const user = await createUser(db, { isSystemOwner: opts.isSystemOwner ?? false });
  const company = await createCompany(db, { createdBy: user.id, status: opts.companyStatus ?? 'active' });

  const [role] = await db
    .insert(roles)
    .values({
      id: uuidv7(),
      companyId: company.id,
      name: ADMINISTRATOR_ROLE_NAME,
      status: 'active',
      permissionType: 'all',
      description: 'Rol administrador de la empresa',
    })
    .returning();

  await db.insert(userCompanies).values({
    id: uuidv7(),
    userId: user.id,
    companyId: company.id,
    roleId: role.id,
    status: 'active',
    isDefault: true,
  });

  return { user, company, role };
}

/**
 * Equivalent of `assignRoleWithPermissions()`: creates a `custom` role with exactly these actions
 * and points the user's membership to it.
 */
export async function assignRoleWithPermissions(
  db: DbExecutor,
  userId: string,
  companyId: string,
  actions: string[],
  name = `Rol ${uuidv7().slice(-6)}`,
): Promise<RoleRow> {
  const [role] = await db
    .insert(roles)
    .values({ id: uuidv7(), companyId, name, status: 'active', permissionType: 'custom' })
    .returning();

  if (actions.length > 0) {
    await db.insert(rolePermissions).values(actions.map((permission) => ({ id: uuidv7(), roleId: role.id, permission })));
  }

  await db
    .update(userCompanies)
    .set({ roleId: role.id })
    .where(and(eq(userCompanies.userId, userId), eq(userCompanies.companyId, companyId)));

  return role;
}

/** Adds an existing user to an existing company. */
export async function addMembership(
  db: DbExecutor,
  userId: string,
  companyId: string,
  opts: { roleId?: string | null; status?: 'active' | 'inactive'; isDefault?: boolean } = {},
): Promise<void> {
  await db.insert(userCompanies).values({
    id: uuidv7(),
    userId,
    companyId,
    roleId: opts.roleId ?? null,
    status: opts.status ?? 'active',
    isDefault: opts.isDefault ?? false,
  });
}
