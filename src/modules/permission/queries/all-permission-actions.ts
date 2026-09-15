import 'server-only';
import { cache } from 'react';
import { and, asc, eq, notInArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { appModules, permissions } from '@/modules/permission/models/permission.model';
import { OWNER_ONLY_MODULES } from '@/modules/shared/permissions/registry';

/** Every active permission action, excluding owner-only modules (`companies`). Used for `permissionType = 'all'` roles. */
export const getAllPermissionActions = cache(async (): Promise<string[]> => {
  const rows = await db
    .select({ action: permissions.action })
    .from(permissions)
    .innerJoin(appModules, eq(appModules.id, permissions.moduleId))
    .where(
      and(
        eq(permissions.isActive, true),
        eq(appModules.isActive, true),
        notInArray(appModules.name, [...OWNER_ONLY_MODULES]),
      ),
    )
    .orderBy(asc(appModules.order), asc(permissions.order));
  return rows.map((r) => r.action);
});

export type PermissionTreeModule = {
  id: string;
  name: string;
  label: string;
  icon: string | null;
  permissions: { id: string; action: string; label: string }[];
};

/** Modules with their active permissions, excluding owner-only modules. Feeds the roles permissions tree. */
export const getPermissionTree = cache(async (): Promise<PermissionTreeModule[]> => {
  const rows = await db
    .select({
      moduleId: appModules.id,
      moduleName: appModules.name,
      moduleLabel: appModules.label,
      moduleIcon: appModules.icon,
      id: permissions.id,
      action: permissions.action,
      label: permissions.label,
    })
    .from(permissions)
    .innerJoin(appModules, eq(appModules.id, permissions.moduleId))
    .where(
      and(
        eq(permissions.isActive, true),
        eq(appModules.isActive, true),
        notInArray(appModules.name, [...OWNER_ONLY_MODULES]),
      ),
    )
    .orderBy(asc(appModules.order), asc(permissions.order));

  const tree = new Map<string, PermissionTreeModule>();
  for (const r of rows) {
    let mod = tree.get(r.moduleId);
    if (!mod) {
      mod = { id: r.moduleId, name: r.moduleName, label: r.moduleLabel, icon: r.moduleIcon, permissions: [] };
      tree.set(r.moduleId, mod);
    }
    mod.permissions.push({ id: r.id, action: r.action, label: r.label });
  }
  return [...tree.values()];
});
