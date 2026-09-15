/**
 * Minimal contract to request a refund when a sale is cancelled. The Refund module will own refunds;
 * until then the Sale module writes the pending row through this interface.
 */
export type PendingRefundData = {
  id: string;
  companyId: string;
  saleId: string;
  clientId: string;
  amount: number;
  reason: string | null;
  requestedBy: string | null;
};

export interface PendingRefundWriter {
  /** Inserts a `pending` refund with the next `REF000001` code of the company. */
  create(refund: PendingRefundData): Promise<void>;
}
