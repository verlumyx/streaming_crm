import type { ConversationRepository } from '../repositories/conversation.repository';

export type InboundDeliveryStatus = {
  externalMessageId: string;
  status: 'delivered' | 'failed';
  error: string | null;
};

/** Applies the provider's delivery receipts to the messages we sent. */
export class BotMessageStatusService {
  constructor(private readonly repository: ConversationRepository) {}

  async execute(companyId: string, statuses: InboundDeliveryStatus[]): Promise<void> {
    for (const status of statuses) {
      await this.repository.updateMessageStatus(companyId, status.externalMessageId, status.status, status.error);
    }
  }
}
