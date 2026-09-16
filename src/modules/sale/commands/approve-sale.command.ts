/** Aprobar: the seller verified the payment of a pending sale. */
export class ApproveSaleCommand {
  constructor(
    readonly id: string,
    readonly companyId: string,
    readonly approvedBy: string | null,
  ) {}
}
