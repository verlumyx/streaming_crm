import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/** Actualizar: a profile line references a number that is not a profile of the account. */
export class AccountProfileNotInAccountException extends ValidationError {
  constructor(index: number, number: number) {
    super(`profiles.${index}.number`, `El perfil ${number} no pertenece a esta cuenta.`);
    this.name = 'AccountProfileNotInAccountException';
  }
}
