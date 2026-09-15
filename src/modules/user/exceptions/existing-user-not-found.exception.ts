import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class ExistingUserNotFoundException extends ValidationError {
  constructor() {
    super('email', 'El usuario existente no es válido. Vuelve a verificar el email.');
    this.name = 'ExistingUserNotFoundException';
  }
}
