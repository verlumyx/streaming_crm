import { ADMINISTRATOR_ROLE_NAME, type PermissionType, type RoleRow, type RoleStatus } from '../models/role.model';
import type { RoleOption } from '../repositories/role.repository';

export type RoleDto = {
  id: string;
  name: string;
  description: string | null;
  status: RoleStatus;
  permissionType: PermissionType;
  /** Granted action strings (only loaded on show / edit; empty for `all` roles). */
  permissions: string[];
  /** The company's `Administrador` role: cannot be edited nor change status. */
  isAdministrator: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type RoleOptionDto = { id: string; name: string; description: string | null };

export function toRoleDto(row: RoleRow & { permissions?: string[] }): RoleDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    permissionType: row.permissionType,
    permissions: [...(row.permissions ?? [])],
    isAdministrator: row.name === ADMINISTRATOR_ROLE_NAME,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export function toRoleOptionDto(option: RoleOption): RoleOptionDto {
  return { id: option.id, name: option.name, description: option.description };
}
