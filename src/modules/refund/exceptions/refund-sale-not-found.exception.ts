import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

/** The sale of a refund being approved no longer exists (soft-deleted). */
export class RefundSaleNotFoundException extends NotFoundError {
  constructor() {
    super('La venta del reembolso no existe.');
    this.name = 'RefundSaleNotFoundException';
  }
}
