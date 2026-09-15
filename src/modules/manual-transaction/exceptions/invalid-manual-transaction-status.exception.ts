import { DomainError } from '@/modules/shared/exceptions/domain-error';

/** Only a pending manual transaction can be approved or cancelled. */
export class InvalidManualTransactionStatusException extends DomainError {
  constructor() {
    super('La transacción manual ya fue resuelta y no puede modificarse.');
    this.name = 'InvalidManualTransactionStatusException';
  }
}
