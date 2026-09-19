import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class ClaimNotFoundException extends NotFoundError {
  constructor() {
    super('Reclamo no encontrado.');
    this.name = 'ClaimNotFoundException';
  }
}
