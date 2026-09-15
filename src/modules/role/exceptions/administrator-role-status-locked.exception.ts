import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/** The `Administrador` role can never be deactivated (nor reactivated). */
export class AdministratorRoleStatusLockedException extends ValidationError {
  constructor() {
    super('status', 'El rol Administrador no se puede modificar.');
    this.name = 'AdministratorRoleStatusLockedException';
  }
}
