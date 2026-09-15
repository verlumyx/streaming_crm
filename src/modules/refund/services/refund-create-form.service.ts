import type { RefundableSale, RefundRepository } from '../repositories/refund.repository';

export const REFUNDABLE_SALES_LIMIT = 100;

/** Crear (form): the latest sales of the company that admit a refund (`active` or `cancelled`). */
export class RefundCreateFormService {
  constructor(private readonly repository: RefundRepository) {}

  execute(companyId: string): Promise<RefundableSale[]> {
    return this.repository.listRefundableSales(companyId, REFUNDABLE_SALES_LIMIT);
  }
}
