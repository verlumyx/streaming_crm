import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class AccountNotFoundException extends NotFoundError {
  constructor() {
    super('Cuenta no encontrada.');
    this.name = 'AccountNotFoundException';
  }
}
