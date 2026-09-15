import { eq } from 'drizzle-orm';
import type { DbExecutor } from '@/modules/shared/infrastructure/db-executor';
import { appModules, permissions } from '@/modules/permission/models/permission.model';
import { menus } from '@/modules/menu/models/menu.model';
import { PERMISSION_REGISTRY } from '@/modules/shared/permissions/registry';
import { MENU_REGISTRY } from '@/modules/shared/menu/menu-registry';
import { uuidv7 } from '@/modules/shared/uuid';

/** Upserts modules + permissions from the registry. Idempotent. */
export async function seedPermissions(db: DbExecutor): Promise<{ modules: number; permissions: number }> {
  let permissionCount = 0;

  for (const mod of PERMISSION_REGISTRY) {
    await db
      .insert(appModules)
      .values({ id: uuidv7(), name: mod.id, label: mod.label, icon: mod.icon, order: mod.order, isActive: true })
      .onConflictDoUpdate({
        target: appModules.name,
        set: { label: mod.label, icon: mod.icon, order: mod.order },
      });

    const [row] = await db.select({ id: appModules.id }).from(appModules).where(eq(appModules.name, mod.id));

    for (const perm of mod.permissions) {
      await db
        .insert(permissions)
        .values({ id: uuidv7(), moduleId: row.id, action: perm.id, label: perm.label, order: perm.order, isActive: true })
        .onConflictDoUpdate({
          target: [permissions.moduleId, permissions.action],
          set: { label: perm.label, order: perm.order },
        });
      permissionCount++;
    }
  }

  return { modules: PERMISSION_REGISTRY.length, permissions: permissionCount };
}

/** Upserts the sidebar from the registry (parents first). Idempotent. */
export async function seedMenus(db: DbExecutor): Promise<number> {
  const ordered = [...MENU_REGISTRY].sort((a, b) => Number(a.parentId !== null) - Number(b.parentId !== null));

  for (const item of ordered) {
    await db
      .insert(menus)
      .values({
        id: item.id,
        parentId: item.parentId,
        title: item.title,
        url: item.url,
        permission: item.permission,
        icon: item.icon,
        order: item.order,
        section: item.section,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: menus.id,
        set: {
          parentId: item.parentId,
          title: item.title,
          url: item.url,
          permission: item.permission,
          icon: item.icon,
          order: item.order,
          section: item.section,
        },
      });
  }

  return ordered.length;
}
