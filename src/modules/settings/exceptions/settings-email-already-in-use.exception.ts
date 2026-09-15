import { ValidationError } from '@/modules/shared/exceptions/domain-error';

export class SettingsEmailAlreadyInUseException extends ValidationError {
  constructor() {
    super('email', 'Este correo ya está en uso.');
    this.name = 'SettingsEmailAlreadyInUseException';
  }
}
