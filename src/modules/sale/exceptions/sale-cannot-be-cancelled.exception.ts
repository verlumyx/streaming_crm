import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class SaleCannotBeCancelledException extends ValidationError {
  constructor() {
    super('id', 'Solo se pueden expulsar ventas aprobadas.');
    this.name = 'SaleCannotBeCancelledException';
  }
}
