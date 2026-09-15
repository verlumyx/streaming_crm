import type { RenewSaleInput } from '../validation/renew-sale.schema';

/** Renovar. `durationDays` / `price` default to the sale snapshot when `null`. `id` is the renewal id. */
export class RenewSaleCommand {
  constructor(
    readonly id: string,
    readonly renewedBy: string | null,
    readonly durationDays: number | null,
    readonly price: number | null,
    readonly notes: string | null,
  ) {}

  static fromInput(input: RenewSaleInput, renewedBy: string | null): RenewSaleCommand {
    return new RenewSaleCommand(input.id, renewedBy, input.durationDays, input.price, input.notes);
  }
}
