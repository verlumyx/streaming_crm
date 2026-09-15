import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/** Registrar renovación: a renewal always moves the cycle forward. */
export class AccountRenewalDateNotAfterException extends ValidationError {
  constructor() {
    super('nextRenewal', 'La nueva fecha de vencimiento debe ser posterior al vencimiento actual.');
    this.name = 'AccountRenewalDateNotAfterException';
  }
}
