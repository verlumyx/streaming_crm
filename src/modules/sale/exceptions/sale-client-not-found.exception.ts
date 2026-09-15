import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class SaleClientNotFoundException extends ValidationError {
  constructor() {
    super('clientId', 'El cliente seleccionado no existe.');
    this.name = 'SaleClientNotFoundException';
  }
}
