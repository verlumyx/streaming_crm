import type { ConversationRepository, ConversationSearch, ConversationWithContact } from '../repositories/conversation.repository';

export class ConversationSearchService {
  constructor(private readonly repository: ConversationRepository) {}

  async execute(search: ConversationSearch): Promise<{ data: ConversationWithContact[]; total: number }> {
    return this.repository.search(search);
  }
}
