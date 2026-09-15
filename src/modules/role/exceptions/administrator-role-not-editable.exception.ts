import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/** The `Administrador` role of a company is fixed: name, description and permissions cannot change. */
export class AdministratorRoleNotEditableException extends ValidationError {
  constructor() {
    super('name', 'El rol Administrador no se puede editar.');
    this.name = 'AdministratorRoleNotEditableException';
  }
}
