import type { BotMessageRow } from '../models/conversation.model';
import type { ConversationRepository, ConversationWithContact } from '../repositories/conversation.repository';
import { ConversationNotFoundException } from '../exceptions/conversation-not-found.exception';

export class ConversationFindService {
  constructor(private readonly repository: ConversationRepository) {}

  async execute(
    id: string,
    companyId: string,
  ): Promise<{ conversation: ConversationWithContact; messages: BotMessageRow[] }> {
    const conversation = await this.repository.findConversation(id, companyId);
    if (!conversation) throw new ConversationNotFoundException();

    return { conversation, messages: await this.repository.messages(id, companyId) };
  }
}
