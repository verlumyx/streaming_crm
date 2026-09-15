import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class ClientNotFoundException extends NotFoundError {
  constructor() {
    super('Cliente no encontrado.');
    this.name = 'ClientNotFoundException';
  }
}
