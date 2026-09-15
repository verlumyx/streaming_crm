import type { RoleRepository, RoleWithPermissions } from '../repositories/role.repository';
import { RoleNotFoundException } from '../exceptions/role-not-found.exception';

/** Ver / Editar. */
export class RoleFindService {
  constructor(private readonly repository: RoleRepository) {}

  async execute(id: string, companyId: string): Promise<RoleWithPermissions> {
    const row = await this.repository.findById(id, companyId);
    if (!row) throw new RoleNotFoundException();
    return row;
  }
}
