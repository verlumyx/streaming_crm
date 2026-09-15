import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class RoleNotFoundException extends NotFoundError {
  constructor() {
    super('Rol no encontrado.');
    this.name = 'RoleNotFoundException';
  }
}
