import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class SaleClientInactiveException extends ValidationError {
  constructor() {
    super('clientId', 'Solo se puede vender a clientes activos.');
    this.name = 'SaleClientInactiveException';
  }
}
