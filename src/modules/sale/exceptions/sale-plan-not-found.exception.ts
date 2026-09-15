import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class SalePlanNotFoundException extends ValidationError {
  constructor() {
    super('planId', 'El plan seleccionado no existe.');
    this.name = 'SalePlanNotFoundException';
  }
}
