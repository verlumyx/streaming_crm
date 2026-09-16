import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class SaleNotPendingException extends ValidationError {
  constructor() {
    super('id', 'Esta venta ya no está por aprobar.');
    this.name = 'SaleNotPendingException';
  }
}
