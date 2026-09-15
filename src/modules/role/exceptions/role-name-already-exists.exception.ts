import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class RoleNameAlreadyExistsException extends ValidationError {
  constructor() {
    super('name', 'Ya existe un rol con este nombre.');
    this.name = 'RoleNameAlreadyExistsException';
  }
}
