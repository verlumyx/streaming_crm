import type { UpdateUserInput } from '../validation/update-user.schema';

export class UpdateUserCommand {
  constructor(
    readonly name: string,
    readonly email: string,
    /** New plain password, or `null` to keep the current one. */
    readonly password: string | null,
    /** Role in the current company (`null` = no role). */
    readonly roleId: string | null,
  ) {}

  static fromInput(input: UpdateUserInput): UpdateUserCommand {
    return new UpdateUserCommand(input.name, input.email, input.password, input.roleId);
  }
}
