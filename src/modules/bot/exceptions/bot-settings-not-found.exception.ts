import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class BotSettingsNotFoundException extends NotFoundError {
  constructor() {
    super('El asistente no está configurado para esta empresa.');
    this.name = 'BotSettingsNotFoundException';
  }
}
