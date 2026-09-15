import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class UserAlreadyInCompanyException extends ValidationError {
  constructor() {
    super('email', 'Este usuario ya tiene acceso a esta empresa.');
    this.name = 'UserAlreadyInCompanyException';
  }
}
