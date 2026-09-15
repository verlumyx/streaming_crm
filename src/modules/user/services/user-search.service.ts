import type { UserRepository, UserWithMembership } from '../repositories/user.repository';
import type { SearchUserCommand } from '../commands/search-user.command';

/** Listar: members of the company with their membership status and role. */
export class UserSearchService {
  constructor(private readonly users: UserRepository) {}

  execute(command: SearchUserCommand): Promise<{ data: UserWithMembership[]; total: number }> {
    return this.users.search(command);
  }
}
