import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/** The sale does not exist in the company, or it is not `active` / `cancelled`. Bound to the `saleId` field. */
export class RefundSaleNotRefundableException extends ValidationError {
  constructor() {
    super('saleId', 'La venta no existe o no admite reembolsos.');
    this.name = 'RefundSaleNotRefundableException';
  }
}
