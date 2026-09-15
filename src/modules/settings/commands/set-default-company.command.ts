import type { SetDefaultCompanyInput } from '../validation/set-default-company.schema';

export class SetDefaultCompanyCommand {
  constructor(
    readonly userId: string,
    readonly companyId: string,
  ) {}

  /** `userId` always comes from the session, never from the client. */
  static fromInput(input: SetDefaultCompanyInput, userId: string): SetDefaultCompanyCommand {
    return new SetDefaultCompanyCommand(userId, input.companyId);
  }
}
