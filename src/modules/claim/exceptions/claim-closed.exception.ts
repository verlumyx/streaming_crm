import { DomainError } from '@/modules/shared/exceptions/domain-error';

/** `closed` is terminal: a closed claim can no longer be edited nor change status. */
export class ClaimClosedException extends DomainError {
  constructor() {
    super('El reclamo está cerrado y ya no puede modificarse.');
    this.name = 'ClaimClosedException';
  }
}
