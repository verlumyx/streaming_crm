import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class SaleAlreadyCancelledException extends ValidationError {
  constructor() {
    super('id', 'Esta venta ya fue expulsada.');
    this.name = 'SaleAlreadyCancelledException';
  }
}
