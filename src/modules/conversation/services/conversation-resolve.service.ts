import type { BotProvider } from '@/modules/bot/models/bot-channel.model';
import type { BotContactRow, BotConversationRow } from '../models/conversation.model';
import type { ConversationRepository } from '../repositories/conversation.repository';

export type ResolveInput = {
  companyId: string;
  channelId: string;
  provider: BotProvider;
  externalId: string;
  displayName: string | null;
  phoneE164: string | null;
};

/**
 * Who is writing and on which thread.
 *
 * Takes an advisory lock on the contact first, so two messages arriving a second apart cannot
 * create two conversations or interleave the history the model will read.
 *
 * When the contact is not linked to a client yet, it is matched by phone — but only when exactly
 * one active client of the company has that number. Two matches means the bot must not guess.
 */
export class ConversationResolveService {
  constructor(private readonly repository: ConversationRepository) {}

  async execute(input: ResolveInput): Promise<{ contact: BotContactRow; conversation: BotConversationRow }> {
    await this.repository.lockContact(input.channelId, input.externalId);

    let contact = await this.repository.resolveContact(input);

    if (!contact.clientId && contact.phoneE164) {
      const clientId = await this.repository.findClientIdByPhone(input.companyId, contact.phoneE164);
      if (clientId) {
        await this.repository.linkClient(contact.id, clientId);
        contact = { ...contact, clientId };
      }
    }

    const conversation = await this.repository.resolveOpenConversation(contact, input.channelId);

    return { contact, conversation };
  }
}
