import type { UserRepository, UserWithMembership } from '../repositories/user.repository';
import { UserNotFoundException } from '../exceptions/user-not-found.exception';

/** Ver / Editar: only users that belong to the company. */
export class UserFindService {
  constructor(private readonly users: UserRepository) {}

  async execute(id: string, companyId: string): Promise<UserWithMembership> {
    const row = await this.users.findById(id, companyId);
    if (!row) throw new UserNotFoundException();
    return row;
  }
}
