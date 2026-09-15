import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { uuidv7 } from '@/modules/shared/uuid';
import { appModules, permissions } from '@/modules/permission/models/permission.model';
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

  it('re-seeding deactivates permissions removed from the registry (services is read-only)', async () => {
    await seedPermissions(db);
    const [servicesModule] = await db.select().from(appModules).where(eq(appModules.name, 'services'));
    await db.insert(permissions).values(
      ['services.create', 'services.update', 'services.update-status'].map((action, index) => ({
        id: uuidv7(),
        moduleId: servicesModule.id,
        action,
        label: action,
        order: 10 + index,
        isActive: true,
      })),
    );

    await seedPermissions(db);

    const stale = await db.select().from(permissions).where(eq(permissions.moduleId, servicesModule.id));
    expect(stale.filter((p) => p.isActive).map((p) => p.action).sort()).toEqual(['services.list', 'services.show']);
    expect(stale).toHaveLength(5);

    const treeActions = (await getPermissionTree()).flatMap((m) => m.permissions.map((p) => p.action)).sort();
    expect([...ASSIGNABLE_PERMISSION_ACTIONS].sort()).toEqual(treeActions);
  });
});
