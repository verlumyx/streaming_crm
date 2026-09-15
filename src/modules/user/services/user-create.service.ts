import { uuidv7 } from '@/modules/shared/uuid';
import type { UserRepository, UserWithMembership } from '../repositories/user.repository';
import type { UserCompanyRepository } from '../repositories/user-company.repository';
import type { PasswordHasher } from './password-hasher';
import { CreateUserCompanyCommand } from '../commands/create-user-company.command';
import type { CreateUserCommand } from '../commands/create-user.command';
import { ExistingUserNotFoundException } from '../exceptions/existing-user-not-found.exception';
import { UserAlreadyInCompanyException } from '../exceptions/user-already-in-company.exception';
import { UserEmailAlreadyExistsException } from '../exceptions/user-email-already-exists.exception';
import { UserNameRequiredException } from '../exceptions/user-name-required.exception';
import { UserPasswordRequiredException } from '../exceptions/user-password-required.exception';
import { UserRoleInvalidException } from '../exceptions/user-role-invalid.exception';

/**
 * Crear (invite flow):
 * - `existingUserId` → the global user only gets an active membership in this company;
 * - otherwise → new user (email unique, not verified) + credential account + active membership.
 * The role, when given, must belong to the same company.
 */
export class UserCreateService {
  constructor(
    private readonly users: UserRepository,
    private readonly memberships: UserCompanyRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(command: CreateUserCommand): Promise<UserWithMembership> {
    if (command.roleId && !(await this.users.roleBelongsToCompany(command.roleId, command.companyId))) {
      throw new UserRoleInvalidException();
    }

    const userId = command.existingUserId
      ? await this.resolveExistingUser(command)
      : await this.createNewUser(command);

    await this.memberships.create(
      new CreateUserCompanyCommand(uuidv7(), userId, command.companyId, command.roleId, 'active', false),
    );

    return this.users.findOrFail(userId, command.companyId);
  }

  private async resolveExistingUser(command: CreateUserCommand): Promise<string> {
    const existing = await this.users.findIdentityById(command.existingUserId!);
    if (!existing || existing.email.toLowerCase() !== command.email.toLowerCase()) {
      throw new ExistingUserNotFoundException();
    }
    if (await this.memberships.find(existing.id, command.companyId)) {
      throw new UserAlreadyInCompanyException();
    }
    return existing.id;
  }

  private async createNewUser(command: CreateUserCommand): Promise<string> {
    if (!command.name) throw new UserNameRequiredException();
    if (!command.password) throw new UserPasswordRequiredException();
    if (await this.users.existsByEmail(command.email)) throw new UserEmailAlreadyExistsException();

    const passwordHash = await this.passwordHasher.hash(command.password);
    await this.users.create(command);
    await this.users.setCredentialPassword(command.id, passwordHash);
    return command.id;
  }
}
