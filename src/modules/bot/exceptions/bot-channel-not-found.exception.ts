import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class BotChannelNotFoundException extends NotFoundError {
  constructor() {
    super('El canal no existe.');
    this.name = 'BotChannelNotFoundException';
  }
}
