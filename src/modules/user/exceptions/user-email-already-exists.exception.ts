import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class UserEmailAlreadyExistsException extends ValidationError {
  constructor() {
    super('email', 'Ya existe un usuario con este email.');
    this.name = 'UserEmailAlreadyExistsException';
  }
}
