import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class CompanyNameAlreadyExistsException extends ValidationError {
  constructor() {
    super('name', 'Ya existe una empresa con este nombre.');
    this.name = 'CompanyNameAlreadyExistsException';
  }
}
