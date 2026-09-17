import { ValidationError } from '@/modules/shared/exceptions/domain-error';

/** The same number / bot cannot belong to two companies: the webhook could not route it. */
export class BotChannelAlreadyExistsException extends ValidationError {
  constructor() {
    super('externalId', 'Ese número o bot ya está conectado a otra empresa.');
    this.name = 'BotChannelAlreadyExistsException';
  }
}
