import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class CompanyNotFoundException extends NotFoundError {
  constructor() {
    super('Empresa no encontrada.');
    this.name = 'CompanyNotFoundException';
  }
}
