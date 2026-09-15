import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class ManualTransactionNotFoundException extends NotFoundError {
  constructor() {
    super('Transacción manual no encontrada.');
    this.name = 'ManualTransactionNotFoundException';
  }
}
