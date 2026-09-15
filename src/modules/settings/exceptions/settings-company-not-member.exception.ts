import { ForbiddenError } from '@/modules/shared/exceptions/domain-error';

/** Equivalent of the original `abort_unless($pivot !== null, 403)`. */
export class SettingsCompanyNotMemberException extends ForbiddenError {
  constructor() {
    super('settings.company', 'No perteneces a esta empresa.');
    this.name = 'SettingsCompanyNotMemberException';
  }
}
