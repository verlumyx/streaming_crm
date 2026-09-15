import type { RoleRow } from '@/modules/role/models/role.model';
import type { RoleOption, RoleRepository, RoleWithPermissions } from '@/modules/role/repositories/role.repository';
import type { CreateRoleCommand } from '@/modules/role/commands/create-role.command';
import type { SearchRoleCommand } from '@/modules/role/commands/search-role.command';
import type { UpdateRoleCommand } from '@/modules/role/commands/update-role.command';
import type { UpdateStatusRoleCommand } from '@/modules/role/commands/update-status-role.command';
import { RoleNotFoundException } from '@/modules/role/exceptions/role-not-found.exception';

/** In-memory `RoleRepository` for service unit tests. */
export class FakeRoleRepository implements RoleRepository {
  rows: RoleWithPermissions[] = [];

  seed(row: Partial<RoleWithPermissions> & { id: string; companyId: string; name: string }): RoleWithPermissions {
    const full: RoleWithPermissions = {
      status: 'active',
      description: null,
      permissionType: 'custom',
      permissions: [],
      createdAt: new Date(),
      updatedAt: null,
      ...row,
    };
    this.rows.push(full);
    return full;
  }

  async create(command: CreateRoleCommand) {
    this.seed({
      id: command.id,
      companyId: command.companyId,
      name: command.name,
      description: command.description,
      permissionType: command.permissionType,
      permissions: command.permissionType === 'custom' ? [...command.permissions] : [],
    });
  }

  async findById(id: string, companyId: string) {
    return this.rows.find((r) => r.id === id && r.companyId === companyId) ?? null;
  }

  async findOrFail(id: string, companyId: string) {
    const row = await this.findById(id, companyId);
    if (!row) throw new RoleNotFoundException();
    return row;
  }

  async update(row: RoleRow, command: UpdateRoleCommand) {
    Object.assign(row, {
      name: command.name,
      description: command.description,
      permissionType: command.permissionType,
      permissions: command.permissionType === 'custom' ? [...command.permissions] : [],
    });
  }

  async updateStatus(row: RoleRow, command: UpdateStatusRoleCommand) {
    row.status = command.status;
  }

  async search(command: SearchRoleCommand) {
    const data = this.rows.filter((r) => r.companyId === command.companyId);
    return { data: data.slice(command.offset, command.offset + command.limit), total: data.length };
  }

  async existsByName(name: string, companyId: string, ignoreId?: string) {
    return this.rows.some(
      (r) => r.companyId === companyId && r.name.toLowerCase() === name.toLowerCase() && r.id !== ignoreId,
    );
  }

  async listActive(companyId: string): Promise<RoleOption[]> {
    return this.rows
      .filter((r) => r.companyId === companyId && r.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(({ id, name, description }) => ({ id, name, description }));
  }
}
