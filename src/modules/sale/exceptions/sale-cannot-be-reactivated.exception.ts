import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class SaleCannotBeReactivatedException extends ValidationError {
  constructor() {
    super('id', 'Esta venta no requiere reactivación. Usa la renovación.');
    this.name = 'SaleCannotBeReactivatedException';
  }
}
