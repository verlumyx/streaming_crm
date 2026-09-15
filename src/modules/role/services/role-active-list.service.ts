import type { RoleOption, RoleRepository } from '../repositories/role.repository';

/** Active roles of a company, ordered by name (role picker of the users form). */
export class RoleActiveListService {
  constructor(private readonly repository: RoleRepository) {}

  execute(companyId: string): Promise<RoleOption[]> {
    return this.repository.listActive(companyId);
  }
}
