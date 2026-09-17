import { NotFoundError } from '@/modules/shared/exceptions/domain-error';

export class ConversationNotFoundException extends NotFoundError {
  constructor() {
    super('La conversación no existe.');
    this.name = 'ConversationNotFoundException';
  }
}
