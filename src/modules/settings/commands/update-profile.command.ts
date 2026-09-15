import type { UpdateProfileInput } from '../validation/update-profile.schema';

export class UpdateProfileCommand {
  constructor(
    readonly userId: string,
    readonly name: string,
    readonly email: string,
  ) {}

  /** `userId` always comes from the session, never from the form. */
  static fromInput(input: UpdateProfileInput, userId: string): UpdateProfileCommand {
    return new UpdateProfileCommand(userId, input.name, input.email);
  }
}
