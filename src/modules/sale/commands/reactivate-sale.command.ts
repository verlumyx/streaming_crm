import type { ReactivateSaleInput } from '../validation/reactivate-sale.schema';

/** Reactivar. Empty `profileIds` = reuse the sale's current profiles. `id` is the renewal id. */
export class ReactivateSaleCommand {
  constructor(
    readonly id: string,
    readonly renewedBy: string | null,
    readonly durationDays: number | null,
    readonly price: number | null,
    readonly profileIds: readonly string[],
    readonly notes: string | null,
  ) {}

  static fromInput(input: ReactivateSaleInput, renewedBy: string | null): ReactivateSaleCommand {
    return new ReactivateSaleCommand(
      input.id,
      renewedBy,
      input.durationDays,
      input.price,
      input.profileIds,
      input.notes,
    );
  }
}
