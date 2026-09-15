import type { RoleRow } from '../models/role.model';
import type { RoleRepository } from '../repositories/role.repository';
import type { SearchRoleCommand } from '../commands/search-role.command';

/** Listar. */
export class RoleSearchService {
  constructor(private readonly repository: RoleRepository) {}

  execute(command: SearchRoleCommand): Promise<{ data: RoleRow[]; total: number }> {
    return this.repository.search(command);
  }
}
