import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class PlanNotFoundException extends NotFoundError {
  constructor() {
    super('Plan no encontrado.');
    this.name = 'PlanNotFoundException';
  }
}
