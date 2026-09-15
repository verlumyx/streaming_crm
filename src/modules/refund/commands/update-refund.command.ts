import type { UpdateRefundInput } from '../validation/update-refund.schema';

/** Actualizar: only the amount and the reason; the sale is immutable. */
export class UpdateRefundCommand {
  constructor(
    readonly amount: number,
    readonly reason: string | null,
  ) {}

  static fromInput(input: UpdateRefundInput): UpdateRefundCommand {
    return new UpdateRefundCommand(input.amount, input.reason);
  }
}
