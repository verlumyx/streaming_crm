import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class UserRoleInvalidException extends ValidationError {
  constructor() {
    super('roleId', 'El rol seleccionado no es válido.');
    this.name = 'UserRoleInvalidException';
  }
}
