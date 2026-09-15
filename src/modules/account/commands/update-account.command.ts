import type { AccountStatus, ProfileStatus } from '../models/account.model';
import type { UpdateAccountInput } from '../validation/update-account.schema';

/** A profile line: `undefined` fields are left untouched. */
export type UpdateAccountProfileLine = {
  readonly number: number;
  readonly pin?: string | null;
  readonly status?: ProfileStatus;
  readonly notes?: string | null;
};

export class UpdateAccountCommand {
  constructor(
    readonly email: string,
    /** `null` keeps the current password. */
    readonly password: string | null,
    readonly cost: number,
    readonly purchaseDate: string,
    readonly nextRenewal: string,
    readonly status: AccountStatus,
    readonly notes: string | null,
    readonly profiles: readonly UpdateAccountProfileLine[],
  ) {}

  static fromInput(input: UpdateAccountInput): UpdateAccountCommand {
    return new UpdateAccountCommand(
      input.email,
      input.password,
      input.cost,
      input.purchaseDate,
      input.nextRenewal,
      input.status,
      input.notes,
      input.profiles.map((p) => ({ number: p.number, pin: p.pin, status: p.status, notes: p.notes })),
    );
  }
}
