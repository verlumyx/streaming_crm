import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/** Profile coherence failure (existence, company/service, capacity, same account). */
export class SaleInvalidProfilesException extends ValidationError {
  constructor(message: string) {
    super('profileIds', message);
    this.name = 'SaleInvalidProfilesException';
  }
}
