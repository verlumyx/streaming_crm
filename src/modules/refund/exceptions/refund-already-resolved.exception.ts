import { DomainError } from '@/modules/shared/exceptions/domain-error';

/** Only a pending refund can be updated, approved or rejected. */
export class RefundAlreadyResolvedException extends DomainError {
  constructor() {
    super('El reembolso ya fue resuelto y no puede modificarse.');
    this.name = 'RefundAlreadyResolvedException';
  }
}
