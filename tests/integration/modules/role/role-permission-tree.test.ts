import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/db/client';
import { getAllPermissionActions, getPermissionTree } from '@/modules/permission/queries/all-permission-actions';
import { ASSIGNABLE_PERMISSION_ACTIONS } from '@/modules/role/validation/update-role.schema';
import { seedPermissions } from '@/db/seed/registries';
import { resetDb } from '../../../helpers/reset-db';

/** Port of OwnerOnlyModuleTreeTest: the owner-only `companies` module is never assignable to a role. */
describe('Árbol de permisos de roles', () => {
  beforeEach(resetDb);

  it('the permissions tree excludes the owner-only companies module', async () => {
    await seedPermissions(db);

    const names = (await getPermissionTree()).map((m) => m.name);

    expect(names).toContain('clients');
    expect(names).toContain('roles');
    expect(names).not.toContain('companies');
  });

  it('the flat permission list excludes the owner-only companies permissions', async () => {
    await seedPermissions(db);

    const flat = await getAllPermissionActions();

    expect(flat).toContain('clients.list');
    expect(flat.some((action) => action.startsWith('companies.'))).toBe(false);
  });

  it('the assignable actions of the role form match the seeded tree', async () => {
    await seedPermissions(db);

    const treeActions = (await getPermissionTree()).flatMap((m) => m.permissions.map((p) => p.action)).sort();

    expect([...ASSIGNABLE_PERMISSION_ACTIONS].sort()).toEqual(treeActions);
  });
});
