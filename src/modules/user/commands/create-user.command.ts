import type { CreateUserInput } from '../validation/create-user.schema';

export class CreateUserCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly email: string,
    /** Required for new users; ignored when `existingUserId` is set. */
    readonly name: string | null,
    /** Plain password for new users; hashed by the service through `PasswordHasher`. */
    readonly password: string | null,
    readonly roleId: string | null,
    /** Global user found in step 1: only a membership for `companyId` is created. */
    readonly existingUserId: string | null,
  ) {}

  static fromInput(input: CreateUserInput, companyId: string): CreateUserCommand {
    return new CreateUserCommand(
      input.id,
      companyId,
      input.email,
      input.name,
      input.password,
      input.roleId,
      input.existingUserId,
    );
  }
}
