import type { ConversationRepository } from '../repositories/conversation.repository';

/** Silences the bot on a thread and hands it to a person, until it is returned or the window ends. */
export class ConversationHandoffService {
  constructor(private readonly repository: ConversationRepository) {}

  async execute(
    conversationId: string,
    reason: string,
    userId: string | null,
    handoffMinutes: number,
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + handoffMinutes * 60_000);
    await this.repository.handOff(conversationId, reason, userId, expiresAt);
  }
}
