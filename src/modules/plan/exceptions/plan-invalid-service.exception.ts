import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/** The selected service does not exist in the plan's company. */
export class PlanInvalidServiceException extends ValidationError {
  constructor() {
    super('serviceId', 'El servicio seleccionado no es válido.');
    this.name = 'PlanInvalidServiceException';
  }
}
