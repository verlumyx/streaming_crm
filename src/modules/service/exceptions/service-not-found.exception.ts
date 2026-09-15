import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class ServiceNotFoundException extends NotFoundError {
  constructor() {
    super('Servicio no encontrado.');
    this.name = 'ServiceNotFoundException';
  }
}
