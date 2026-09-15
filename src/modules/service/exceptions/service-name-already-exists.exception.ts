import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class ServiceNameAlreadyExistsException extends ValidationError {
  constructor() {
    super('name', 'Ya existe un servicio con este nombre.');
    this.name = 'ServiceNameAlreadyExistsException';
  }
}
