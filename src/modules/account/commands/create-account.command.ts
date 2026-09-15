import type { AccountStatus } from '../models/account.model';
import type { CreateAccountInput } from '../validation/create-account.schema';

/** PIN pre-loaded for a profile number when the account is created. */
export type CreateAccountProfileLine = { readonly number: number; readonly pin: string | null };

export class CreateAccountCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly createdBy: string | null,
    readonly serviceId: string,
    readonly email: string,
    /** Plain text: the service encrypts it before it reaches the repository. */
    readonly password: string,
    readonly cost: number,
    readonly purchaseDate: string,
    readonly nextRenewal: string,
    readonly status: AccountStatus,
    readonly notes: string | null,
    readonly profiles: readonly CreateAccountProfileLine[],
  ) {}

  static fromInput(input: CreateAccountInput, companyId: string, createdBy: string | null): CreateAccountCommand {
    return new CreateAccountCommand(
      input.id,
      companyId,
      createdBy,
      input.serviceId,
      input.email,
      input.password,
      input.cost,
      input.purchaseDate,
      input.nextRenewal,
      input.status,
      input.notes,
      input.profiles.map((p) => ({ number: p.number, pin: p.pin })),
    );
  }
}
