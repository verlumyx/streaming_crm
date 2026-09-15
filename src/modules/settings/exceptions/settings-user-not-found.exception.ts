import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class SettingsUserNotFoundException extends NotFoundError {
  constructor() {
    super('Usuario no encontrado.');
    this.name = 'SettingsUserNotFoundException';
  }
}
