import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class ClientEmailAlreadyExistsException extends ValidationError {
  constructor() {
    super('email', 'Ya existe un cliente con este correo.');
    this.name = 'ClientEmailAlreadyExistsException';
  }
}
