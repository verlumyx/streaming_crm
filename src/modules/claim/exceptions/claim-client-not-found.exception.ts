import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/** The selected client does not belong to the company. Bound to the `clientId` field. */
export class ClaimClientNotFoundException extends ValidationError {
  constructor() {
    super('clientId', 'El cliente no existe en esta empresa.');
    this.name = 'ClaimClientNotFoundException';
  }
}
