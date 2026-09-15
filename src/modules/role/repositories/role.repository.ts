import type { RoleRow } from '../models/role.model';
import type { CreateRoleCommand } from '../commands/create-role.command';
import type { SearchRoleCommand } from '../commands/search-role.command';
import type { UpdateRoleCommand } from '../commands/update-role.command';
import type { UpdateStatusRoleCommand } from '../commands/update-status-role.command';

/** A role with the permission action strings it stores (empty for `all` roles). */
export type RoleWithPermissions = RoleRow & { permissions: string[] };

/** Active role of a company, for pickers (users form). */
export type RoleOption = { id: string; name: string; description: string | null };

export interface RoleRepository {
  create(command: CreateRoleCommand): Promise<void>;
  findById(id: string, companyId: string): Promise<RoleWithPermissions | null>;
  findOrFail(id: string, companyId: string): Promise<RoleWithPermissions>;
  update(row: RoleRow, command: UpdateRoleCommand): Promise<void>;
  updateStatus(row: RoleRow, command: UpdateStatusRoleCommand): Promise<void>;
  search(command: SearchRoleCommand): Promise<{ data: RoleRow[]; total: number }>;

  existsByName(name: string, companyId: string, ignoreId?: string): Promise<boolean>;
  listActive(companyId: string): Promise<RoleOption[]>;
}
