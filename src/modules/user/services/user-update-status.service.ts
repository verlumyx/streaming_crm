import type { UserCompanyRepository } from '../repositories/user-company.repository';
import type { UpdateStatusUserCommand } from '../commands/update-status-user.command';
import { UserNotFoundException } from '../exceptions/user-not-found.exception';

/** Actualizar Estado: activates / deactivates the membership in THIS company only (never the global user). */
export class UserUpdateStatusService {
  constructor(private readonly memberships: UserCompanyRepository) {}

  async execute(userId: string, companyId: string, command: UpdateStatusUserCommand): Promise<void> {
    const membership = await this.memberships.find(userId, companyId);
    if (!membership) throw new UserNotFoundException();

    await this.memberships.updateStatus(membership, command);
  }
}
