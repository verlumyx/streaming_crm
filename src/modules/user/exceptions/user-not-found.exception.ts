import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class UserNotFoundException extends NotFoundError {
  constructor() {
    super('Usuario no encontrado.');
    this.name = 'UserNotFoundException';
  }
}
