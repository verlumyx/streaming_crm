import { ADMINISTRATOR_ROLE_NAME } from '../models/role.model';
import type { RoleRepository, RoleWithPermissions } from '../repositories/role.repository';
import type { UpdateRoleCommand } from '../commands/update-role.command';
import { RoleNotFoundException } from '../exceptions/role-not-found.exception';
import { RoleNameAlreadyExistsException } from '../exceptions/role-name-already-exists.exception';
import { AdministratorRoleNotEditableException } from '../exceptions/administrator-role-not-editable.exception';

/** Actualizar: data + full replacement of the permission set. The `Administrador` role is read-only. */
export class RoleUpdateService {
  constructor(private readonly repository: RoleRepository) {}

  async execute(id: string, companyId: string, command: UpdateRoleCommand): Promise<RoleWithPermissions> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new RoleNotFoundException();

    if (row.name === ADMINISTRATOR_ROLE_NAME) throw new AdministratorRoleNotEditableException();

    if (await this.repository.existsByName(command.name, companyId, id)) {
      throw new RoleNameAlreadyExistsException();
    }

    await this.repository.update(row, command);
    return this.repository.findOrFail(id, companyId);
  }
}
