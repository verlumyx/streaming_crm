import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/** The email is unique per service (case-insensitive). */
export class AccountEmailAlreadyExistsException extends ValidationError {
  constructor() {
    super('email', 'Ya existe una cuenta con este email en el servicio.');
    this.name = 'AccountEmailAlreadyExistsException';
  }
}
