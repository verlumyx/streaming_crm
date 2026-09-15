/** Aprobar / Rechazar: who resolves which refund of which company. */
export class ResolveRefundCommand {
  constructor(
    readonly refundId: string,
    readonly companyId: string,
    readonly resolvedBy: string | null,
  ) {}
}
