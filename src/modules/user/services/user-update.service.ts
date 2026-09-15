import type { UserRepository, UserWithMembership } from '../repositories/user.repository';
import type { UserCompanyRepository } from '../repositories/user-company.repository';
import type { PasswordHasher } from './password-hasher';
import type { UpdateUserCommand } from '../commands/update-user.command';
import { UserEmailAlreadyExistsException } from '../exceptions/user-email-already-exists.exception';
import { UserNotFoundException } from '../exceptions/user-not-found.exception';
import { UserRoleInvalidException } from '../exceptions/user-role-invalid.exception';

/**
 * Actualizar: name/email (global, email unique ignoring self), optional new password (re-hashed on the
 * credential account) and the role of the user in this company.
 */
export class UserUpdateService {
  constructor(
    private readonly users: UserRepository,
    private readonly memberships: UserCompanyRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(id: string, companyId: string, command: UpdateUserCommand): Promise<UserWithMembership> {
    const row = await this.users.findById(id, companyId);
    if (!row) throw new UserNotFoundException();

    if (await this.users.existsByEmail(command.email, id)) throw new UserEmailAlreadyExistsException();

    if (command.roleId && !(await this.users.roleBelongsToCompany(command.roleId, companyId))) {
      throw new UserRoleInvalidException();
    }

    await this.users.update(row, command);
    if (command.password) {
      await this.users.setCredentialPassword(id, await this.passwordHasher.hash(command.password));
    }
    await this.memberships.updateRole(id, companyId, command.roleId);

    return this.users.findOrFail(id, companyId);
  }
}
