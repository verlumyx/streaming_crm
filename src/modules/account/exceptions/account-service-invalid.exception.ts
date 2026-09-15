import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/** The selected service does not exist in the company. */
export class AccountServiceInvalidException extends ValidationError {
  constructor() {
    super('serviceId', 'El servicio seleccionado no es válido.');
    this.name = 'AccountServiceInvalidException';
  }
}
