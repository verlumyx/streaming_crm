import { ConflictError } from '@/modules/shared/exceptions/domain-error';
import type { UnavailableProfile } from '../domain/sale-rules';

/** Some locked profiles are no longer available. The UI switches to re-pick / replacement mode. */
export class SaleProfilesUnavailableException extends ConflictError {
  readonly unavailableProfiles: UnavailableProfile[];

  constructor(
    unavailableProfiles: UnavailableProfile[],
    message = 'Algunos perfiles ya no están disponibles. Selecciona otros perfiles del mismo servicio.',
  ) {
    super(message, { unavailableProfiles });
    this.name = 'SaleProfilesUnavailableException';
    this.unavailableProfiles = unavailableProfiles;
  }
}
