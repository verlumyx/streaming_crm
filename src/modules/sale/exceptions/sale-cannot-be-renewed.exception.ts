import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class SaleCannotBeRenewedException extends ValidationError {
  constructor() {
    super('id', 'Esta venta no puede renovarse en su estado actual. Usa la reactivación.');
    this.name = 'SaleCannotBeRenewedException';
  }
}
