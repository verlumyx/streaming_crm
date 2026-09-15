import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { rolePermissions, roles, type NewRoleRow, type RoleRow } from '@/modules/role/models/role.model';
import { uuidv7 } from '@/modules/shared/uuid';
import { defined } from './utils';

let sequence = 0;

export function buildRole(overrides: Partial<NewRoleRow> & { companyId: string }): NewRoleRow {
  sequence++;
  return {
    id: uuidv7(),
    name: `Rol ${sequence} ${uuidv7().slice(-6)}`,
    status: 'active',
    permissionType: 'custom',
    description: null,
    ...defined(overrides),
  } as NewRoleRow;
}

/** A role of the company with the given permission actions (only stored for `custom` roles). */
export async function createRole(
  db: DbExecutor,
  overrides: Partial<NewRoleRow> & { companyId: string },
  permissions: string[] = [],
): Promise<RoleRow> {
  const [row] = await db.insert(roles).values(buildRole(overrides)).returning();
  if (permissions.length > 0) {
    await db.insert(rolePermissions).values(permissions.map((permission) => ({ id: uuidv7(), roleId: row.id, permission })));
  }
  return row;
}
