import type { RejectSaleInput } from '../validation/reject-sale.schema';

/** Rechazar: the payment of a pending sale was not verified. */
export class RejectSaleCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly rejectedBy: string | null,
    readonly rejectionReason: string,
  ) {}

  static fromInput(input: RejectSaleInput, id: string, companyId: string, rejectedBy: string | null): RejectSaleCommand {
    return new RejectSaleCommand(id, companyId, rejectedBy, input.rejectionReason);
  }
}
