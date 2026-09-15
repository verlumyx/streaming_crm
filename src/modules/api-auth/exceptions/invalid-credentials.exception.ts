import { DomainError } from '@/modules/shared/exceptions/domain-error';

export class InvalidCredentialsException extends DomainError {
  readonly status = 401;

  constructor() {
    super('Las credenciales proporcionadas son incorrectas.');
    this.name = 'InvalidCredentialsException';
  }
}
