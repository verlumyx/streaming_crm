import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/** Actualizar: the requested profile status change is not allowed by `canTransitionProfile`. */
export class AccountProfileTransitionNotAllowedException extends ValidationError {
  constructor(number: number, from: string, to: string) {
    super('profiles', `Transición de estado no permitida para el perfil ${number}: ${from} → ${to}.`);
    this.name = 'AccountProfileTransitionNotAllowedException';
  }
}
