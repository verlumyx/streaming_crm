import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/** Crear: a pre-loaded PIN points to a profile number the service does not have. */
export class AccountProfileNumberOutOfRangeException extends ValidationError {
  constructor(index: number, maxProfiles: number) {
    super(`profiles.${index}.number`, `El número de perfil debe estar entre 1 y ${maxProfiles}.`);
    this.name = 'AccountProfileNumberOutOfRangeException';
  }
}
