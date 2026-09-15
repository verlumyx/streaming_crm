import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class RefundNotFoundException extends NotFoundError {
  constructor() {
    super('Reembolso no encontrado.');
    this.name = 'RefundNotFoundException';
  }
}
