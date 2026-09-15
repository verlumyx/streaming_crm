import type { CancelSaleInput } from '../validation/cancel-sale.schema';

/** Expulsar. When `createRefund`, a pending refund is requested (amount/reason default to price/cancellation reason). */
export class CancelSaleCommand {
  constructor(
    readonly requestedBy: string | null,
    readonly cancellationReason: string,
    readonly createRefund: boolean,
    readonly refundAmount: number | null,
    readonly refundReason: string | null,
  ) {}

  static fromInput(input: CancelSaleInput, requestedBy: string | null): CancelSaleCommand {
    return new CancelSaleCommand(
      requestedBy,
      input.cancellationReason,
      input.createRefund,
      input.createRefund ? input.refundAmount : null,
      input.createRefund ? input.refundReason : null,
    );
  }
}
