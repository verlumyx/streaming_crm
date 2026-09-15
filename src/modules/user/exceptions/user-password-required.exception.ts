import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class UserPasswordRequiredException extends ValidationError {
  constructor() {
    super('password', 'La contraseña es obligatoria.');
    this.name = 'UserPasswordRequiredException';
  }
}
