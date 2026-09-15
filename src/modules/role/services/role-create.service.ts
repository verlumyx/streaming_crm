import type { RoleRepository, RoleWithPermissions } from '../repositories/role.repository';
import type { CreateRoleCommand } from '../commands/create-role.command';
import { RoleNameAlreadyExistsException } from '../exceptions/role-name-already-exists.exception';

/** Crear: the name is unique per company (case-insensitive); new roles are active. */
export class RoleCreateService {
  constructor(private readonly repository: RoleRepository) {}

  async execute(command: CreateRoleCommand): Promise<RoleWithPermissions> {
    if (await this.repository.existsByName(command.name, command.companyId)) {
      throw new RoleNameAlreadyExistsException();
    }
    await this.repository.create(command);
    return this.repository.findOrFail(command.id, command.companyId);
  }
}
