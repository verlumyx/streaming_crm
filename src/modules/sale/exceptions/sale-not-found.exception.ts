import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class SaleNotFoundException extends NotFoundError {
  constructor() {
    super('Venta no encontrada.');
    this.name = 'SaleNotFoundException';
  }
}
