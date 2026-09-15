import type { RoleStatus } from '@/modules/role/models/role.model';

/** Query-string filters of the list (entity type is `RoleDto` from the serializer). */
export type RoleFilters = {
  name?: string;
  status?: RoleStatus;
  description?: string;
};

export type RoleMeta = {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

/** Module of the permissions tree (same shape as `getPermissionTree()`). */
export type PermissionTreeModuleDto = {
  id: string;
  name: string;
  label: string;
  icon: string | null;
  permissions: { id: string; action: string; label: string }[];
};

export const PERMISSION_TYPE_LABELS = { all: 'Todos', custom: 'Personalizados' } as const;
