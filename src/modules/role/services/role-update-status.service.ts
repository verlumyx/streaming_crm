import { ADMINISTRATOR_ROLE_NAME } from '../models/role.model';
import type { RoleRepository, RoleWithPermissions } from '../repositories/role.repository';
import type { UpdateStatusRoleCommand } from '../commands/update-status-role.command';
import { RoleNotFoundException } from '../exceptions/role-not-found.exception';
import { AdministratorRoleStatusLockedException } from '../exceptions/administrator-role-status-locked.exception';

/** Actualizar Estado: activate / deactivate (never delete). The `Administrador` role stays active. */
export class RoleUpdateStatusService {
  constructor(private readonly repository: RoleRepository) {}

  async execute(id: string, companyId: string, command: UpdateStatusRoleCommand): Promise<RoleWithPermissions> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new RoleNotFoundException();

    if (row.name === ADMINISTRATOR_ROLE_NAME) throw new AdministratorRoleStatusLockedException();

    await this.repository.updateStatus(row, command);
    return this.repository.findOrFail(id, companyId);
  }
}
